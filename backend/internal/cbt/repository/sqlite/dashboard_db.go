package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"cbt-engine-service/internal/cbt/domain"
)

// GetParticipantNISN — resolve participant_id → nisn
func (r *ExamDB) GetParticipantNISN(ctx context.Context, participantID string) (string, error) {
	var nisn string
	err := r.DB.QueryRowContext(ctx,
		`SELECT nisn FROM eligible_participants WHERE participant_id = ? LIMIT 1`,
		participantID).Scan(&nisn)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return nisn, err
}

// GetParticipantDashboard — 3 section response
func (r *ExamDB) GetParticipantDashboard(ctx context.Context, participantID string) (*domain.DashboardResponse, error) {
	resp := &domain.DashboardResponse{
		Scheduled: []domain.DashboardExamItem{},
		Makeup:    []domain.DashboardExamItem{},
		Completed: []domain.CompletedExamItem{},
	}

	// 1. Scheduled + Makeup (dari participant_sessions)
	// FIX: Tambahkan COALESCE pada es.start_time, end_time, status, dan session_type
	const q = `
		SELECT es.exam_id, es.id, COALESCE(e.title, es.exam_id),
		       COALESCE(es.session_type, ''), COALESCE(es.start_time, ''), COALESCE(es.end_time, ''), COALESCE(es.status, ''),
		       COALESCE(ps.is_makeup, 0), COALESCE(ps.makeup_reason, '')
		FROM participant_sessions ps
		JOIN exam_sessions es ON es.id = ps.session_id
		LEFT JOIN exams e ON e.id = es.exam_id
		WHERE ps.participant_id = ?
		ORDER BY es.start_time ASC`

	rows, err := r.DB.QueryContext(ctx, q, participantID)
	if err != nil {
		return nil, fmt.Errorf("dashboard query: %w", err)
	}
	defer rows.Close()

	now := time.Now()
	for rows.Next() {
		var it domain.DashboardExamItem
		var isMakeup int

		// FIX: Scan menggunakan sql.NullString agar aman dari NULL
		var startStr, endStr sql.NullString
		if err := rows.Scan(&it.ExamID, &it.SessionID, &it.Title,
			&it.SessionType, &startStr, &endStr, &it.SessionStatus,
			&isMakeup, &it.MakeupReason); err != nil {
			return nil, fmt.Errorf("dashboard scan scheduled: %w", err)
		}

		it.StartTime = startStr.String
		it.EndTime = endStr.String
		it.IsMakeup = isMakeup == 1

		// Derived status (Parse waktu SQLite: "2006-01-02 15:04:05" atau RFC3339)
		layout := "2006-01-02 15:04:05"
		if len(it.StartTime) > 10 && it.StartTime[10] == 'T' {
			layout = time.RFC3339
		}

		start, errStart := time.Parse(layout, it.StartTime)
		end, errEnd := time.Parse(layout, it.EndTime)

		if errStart != nil || errEnd != nil {
			it.SessionStatus = "UNKNOWN"
		} else {
			switch {
			case it.SessionStatus == "CLOSED":
				// skip — sudah selesai
				continue
			case it.SessionStatus == "ACTIVE":
				// Dipaksa ACTIVE oleh admin, jangan ditimpa waktu
			case now.Before(start):
				it.SessionStatus = "NOT_STARTED"
			case now.After(end):
				it.SessionStatus = "EXPIRED"
			default:
				it.SessionStatus = "ACTIVE"
			}
		}

		if it.IsMakeup {
			resp.Makeup = append(resp.Makeup, it)
		} else {
			resp.Scheduled = append(resp.Scheduled, it)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// 2. Completed (dari exam_results)
	// FIX: Tambahkan COALESCE pada er.total_questions, er.correct_answers, er.final_score, er.status, er.submitted_at
	const qc = `
		SELECT er.exam_id, COALESCE(e.title, er.exam_id),
		       COALESCE(er.total_questions, 0), COALESCE(er.correct_answers, 0), COALESCE(er.final_score, 0.0),
		       COALESCE(er.status, ''), COALESCE(er.submitted_at, '')
		FROM exam_results er
		LEFT JOIN exams e ON e.id = er.exam_id
		WHERE er.participant_id = ?
		ORDER BY er.submitted_at DESC`

	rowsC, err := r.DB.QueryContext(ctx, qc, participantID)
	if err != nil {
		return nil, err
	}
	defer rowsC.Close()

	for rowsC.Next() {
		var c domain.CompletedExamItem
		var submittedAt string
		if err := rowsC.Scan(&c.ExamID, &c.Title, &c.TotalQuestions,
			&c.CorrectAnswers, &c.FinalScore, &c.Status, &submittedAt); err != nil {
			return nil, fmt.Errorf("dashboard scan completed: %w", err)
		}
		c.SubmittedAt = submittedAt
		resp.Completed = append(resp.Completed, c)
	}
	if err := rowsC.Err(); err != nil {
		return nil, err
	}
	return resp, nil
}
