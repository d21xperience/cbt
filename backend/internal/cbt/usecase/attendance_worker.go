package usecase

import (
	"context"
	"database/sql"
	"log"
	"time"

	"github.com/google/uuid"
)

// StartAttendanceWorker — scan sesi yang baru selesai, tandai attendance.
// Logika: peserta PENDING → PRESENT kalau ada hasil, ABSENT kalau tidak.
// ABSENT → auto-assign ke sesi SUSULAN (kalau ada) atau flag needs_makeup.
func StartAttendanceWorker(ctx context.Context, db *sql.DB) {
	log.Println("📊 Attendance Worker started (interval: 2 menit)")

	ticker := time.NewTicker(2 * time.Minute)
	defer ticker.Stop()

	// Langsung scan saat start
	scanEndedSessions(ctx, db)

	for {
		select {
		case <-ctx.Done():
			log.Println("🛑 Attendance Worker shutting down")
			return
		case <-ticker.C:
			scanEndedSessions(ctx, db)
		}
	}
}

func scanEndedSessions(ctx context.Context, db *sql.DB) {
	now := time.Now().UTC().Format(time.RFC3339)

	// Cari session yang sudah lewat end_time tapi masih ada PENDING
	const q = `
		SELECT DISTINCT es.id, es.exam_id
		FROM exam_sessions es
		JOIN participant_sessions ps ON ps.session_id = es.id
		WHERE es.end_time < ?
		  AND es.status != 'CLOSED'
		  AND ps.attendance_status = 'PENDING'`

	rows, err := db.QueryContext(ctx, q, now)
	if err != nil {
		log.Printf("[ATTENDANCE] Query error: %v", err)
		return
	}
	defer rows.Close()

	type sess struct{ ID, ExamID string }
	var sessions []sess
	for rows.Next() {
		var s sess
		if err := rows.Scan(&s.ID, &s.ExamID); err == nil {
			sessions = append(sessions, s)
		}
	}

	for _, s := range sessions {
		markAttendance(ctx, db, s.ID, s.ExamID)
		autoAssignMakeup(ctx, db, s.ID, s.ExamID)
	}
}

// markAttendance — set PRESENT jika ada hasil ujian, ABSENT jika tidak
func markAttendance(ctx context.Context, db *sql.DB, sessionID, examID string) {
	const q = `
		UPDATE participant_sessions
		SET attendance_status = CASE
		    WHEN EXISTS(
		      SELECT 1 FROM exam_results er
		      WHERE er.participant_id = participant_sessions.participant_id
		        AND er.exam_id = ?
		    ) THEN 'PRESENT'
		    ELSE 'ABSENT'
		END
		WHERE session_id = ? AND attendance_status = 'PENDING'`

	res, err := db.ExecContext(ctx, q, examID, sessionID)
	if err != nil {
		log.Printf("[ATTENDANCE] Mark error (session=%s): %v", sessionID, err)
		return
	}
	if n, _ := res.RowsAffected(); n > 0 {
		log.Printf("[ATTENDANCE] Session %s: %d peserta ditandai", sessionID, n)
	}
}

// autoAssignMakeup — assign ABSENT peserta ke sesi SUSULAN (kalau ada)
func autoAssignMakeup(ctx context.Context, db *sql.DB, regulerSessionID, examID string) {
	// Cari sesi SUSULAN aktif untuk exam yang sama
	var makeupSessionID string
	err := db.QueryRowContext(ctx, `
		SELECT id FROM exam_sessions
		WHERE exam_id = ? AND session_type = 'SUSULAN' AND status != 'CLOSED'
		ORDER BY start_time ASC LIMIT 1`, examID).Scan(&makeupSessionID)
	if err == sql.ErrNoRows {
		// Tidak ada sesi susulan — log untuk admin
		var count int
		db.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM participant_sessions
			WHERE session_id = ? AND attendance_status = 'ABSENT' AND is_makeup = 0`,
			regulerSessionID).Scan(&count)
		if count > 0 {
			log.Printf("[ATTENDANCE] %d peserta ABSENT di exam %s, tapi belum ada sesi SUSULAN", count, examID)
		}
		return
	}
	if err != nil {
		log.Printf("[ATTENDANCE] Query makeup error: %v", err)
		return
	}

	// Ambil semua peserta ABSENT yang belum is_makeup
	rows, err := db.QueryContext(ctx, `
		SELECT participant_id FROM participant_sessions
		WHERE session_id = ? AND attendance_status = 'ABSENT' AND is_makeup = 0`,
		regulerSessionID)
	if err != nil {
		return
	}
	defer rows.Close()

	var absentIDs []string
	for rows.Next() {
		var pid string
		if err := rows.Scan(&pid); err == nil {
			absentIDs = append(absentIDs, pid)
		}
	}

	for _, pid := range absentIDs {
		_, err := db.ExecContext(ctx, `
			INSERT INTO participant_sessions
			(participant_id, session_id, status, attendance_status, is_makeup, makeup_reason, makeup_approved_by, makeup_approved_at)
			VALUES (?, ?, 'ELIGIBLE', 'PENDING', 1, 'absent', 'system-auto', CURRENT_TIMESTAMP)
			ON CONFLICT(participant_id, session_id) DO NOTHING`,
			pid, makeupSessionID)
		if err != nil {
			log.Printf("[ATTENDANCE] Assign makeup %s: %v", pid, err)
		} else {
			log.Printf("[ATTENDANCE] Auto-assign %s ke sesi susulan %s", pid, makeupSessionID)
		}
	}
}

// Helper untuk admin manual assign (dipakai nanti)
func AssignMakeupManual(ctx context.Context, db *sql.DB, participantID, sessionID, adminID, reason string) error {
	_, err := db.ExecContext(ctx, `
		INSERT INTO participant_sessions
		(participant_id, session_id, status, attendance_status, is_makeup, makeup_reason, makeup_approved_by, makeup_approved_at)
		VALUES (?, ?, 'ELIGIBLE', 'PENDING', 1, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(participant_id, session_id) DO UPDATE SET
		  is_makeup = 1, makeup_reason = excluded.makeup_reason,
		  makeup_approved_by = excluded.makeup_approved_by,
		  makeup_approved_at = CURRENT_TIMESTAMP`,
		participantID, sessionID, reason, adminID)
	_ = uuid.NewString() // suppress unused import in this stub
	return err
}

