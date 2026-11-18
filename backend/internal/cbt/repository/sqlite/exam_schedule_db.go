package sqlite

import (
	"cbt-engine-service/internal/cbt/domain"

	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type ExamScheduleDB struct{ DB *sql.DB }

func NewExamScheduleDB(db *sql.DB) *ExamScheduleDB { return &ExamScheduleDB{DB: db} }

func (r *ExamScheduleDB) ListByPeriodID(ctx context.Context, periodID string) ([]domain.ExamSchedule, error) {
	q := `
		SELECT 
			COALESCE(es.id, ''), 
			COALESCE(c.id, ''),          -- ✅ ClassID
			COALESCE(s.kode, ''),        -- ✅ SubjectKode
			l.id, 
			COALESCE(es.jenis_ujian_id, ''), 
			COALESCE(es.tanggal, ''), 
			COALESCE(es.jam_mulai, ''), 
			COALESCE(es.durasi_menit, 0), 
			COALESCE(es.pengawas1_id, ''), 
			COALESCE(es.pengawas2_id, ''), 
			COALESCE(es.ruang_id, ''), 
			COALESCE(es.status, 'BELUM_DIJADWALKAN'),
			COALESCE(et.kode, ''), 
			COALESCE(s.nama, ''), 
			COALESCE(c.nama, ''), 
			COALESCE(t.nama, ''),
			COALESCE(r.nama, ''), 
			COALESCE(t1.nama, ''), 
			COALESCE(t2.nama, ''),
			CAST(c.tingkat AS TEXT),
			COALESCE(l.academic_period_id, '')
		FROM lessons l
		JOIN subjects s ON s.id = l.subject_id
		JOIN classes c ON c.id = l.class_id
		JOIN teachers t ON t.id = l.teacher_id
		LEFT JOIN exam_schedules es ON es.lesson_id = l.id AND es.academic_period_id = l.academic_period_id
		LEFT JOIN exam_types et ON et.id = es.jenis_ujian_id
		LEFT JOIN rooms r ON r.id = es.ruang_id
		LEFT JOIN teachers t1 ON t1.id = es.pengawas1_id
		LEFT JOIN teachers t2 ON t2.id = es.pengawas2_id
		WHERE l.academic_period_id = ?
		ORDER BY c.tingkat ASC, c.nama ASC, s.nama ASC, es.tanggal ASC`

	rows, err := r.DB.QueryContext(ctx, q, periodID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.ExamSchedule
	for rows.Next() {
		var es domain.ExamSchedule
		// ✅ Scan urutan HARUS SAMA PERSIS dengan SELECT di atas
		err := rows.Scan(
			&es.ID,
			&es.ClassID,     // ✅
			&es.SubjectKode, // ✅
			&es.LessonID,
			&es.JenisUjianID,
			&es.Tanggal,
			&es.JamMulai,
			&es.DurasiMenit,
			&es.Pengawas1ID,
			&es.Pengawas2ID,
			&es.RuangID,
			&es.Status,
			&es.JenisUjianKode,
			&es.SubjectNama,
			&es.ClassName,
			&es.TeacherNama,
			&es.RuangNama,
			&es.Pengawas1Nama,
			&es.Pengawas2Nama,
			&es.Tingkat,
			&es.AcademicPeriodID,
		)
		if err != nil {
			return nil, err
		}
		list = append(list, es)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return list, nil
}

func (r *ExamScheduleDB) List(ctx context.Context) ([]domain.ExamSchedule, error) {
	q := `
		SELECT 
			COALESCE(es.id, ''), 
			COALESCE(c.id, ''),          -- ✅ ClassID
			COALESCE(s.kode, ''),        -- ✅ SubjectKode
			l.id, 
			COALESCE(es.jenis_ujian_id, ''), 
			COALESCE(es.tanggal, ''), 
			COALESCE(es.jam_mulai, ''), 
			COALESCE(es.durasi_menit, 0), 
			COALESCE(es.pengawas1_id, ''), 
			COALESCE(es.pengawas2_id, ''), 
			COALESCE(es.ruang_id, ''), 
			COALESCE(es.status, 'BELUM_DIJADWALKAN'),
			COALESCE(et.kode, ''), 
			COALESCE(s.nama, ''), 
			COALESCE(c.nama, ''), 
			COALESCE(t.nama, ''),
			COALESCE(r.nama, ''), 
			COALESCE(t1.nama, ''), 
			COALESCE(t2.nama, ''),
			CAST(c.tingkat AS TEXT),
			COALESCE(l.academic_period_id, '')
		FROM lessons l
		JOIN subjects s ON s.id = l.subject_id
		JOIN classes c ON c.id = l.class_id
		JOIN teachers t ON t.id = l.teacher_id
		LEFT JOIN exam_schedules es ON es.lesson_id = l.id AND es.academic_period_id = l.academic_period_id
		LEFT JOIN exam_types et ON et.id = es.jenis_ujian_id
		LEFT JOIN rooms r ON r.id = es.ruang_id
		LEFT JOIN teachers t1 ON t1.id = es.pengawas1_id
		LEFT JOIN teachers t2 ON t2.id = es.pengawas2_id
		ORDER BY c.tingkat ASC, c.nama ASC, s.nama ASC, es.tanggal ASC`

	rows, err := r.DB.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.ExamSchedule
	for rows.Next() {
		var es domain.ExamSchedule
		err := rows.Scan(
			&es.ID,
			&es.ClassID,     // ✅
			&es.SubjectKode, // ✅
			&es.LessonID,
			&es.JenisUjianID,
			&es.Tanggal,
			&es.JamMulai,
			&es.DurasiMenit,
			&es.Pengawas1ID,
			&es.Pengawas2ID,
			&es.RuangID,
			&es.Status,
			&es.JenisUjianKode,
			&es.SubjectNama,
			&es.ClassName,
			&es.TeacherNama,
			&es.RuangNama,
			&es.Pengawas1Nama,
			&es.Pengawas2Nama,
			&es.Tingkat,
			&es.AcademicPeriodID,
		)
		if err != nil {
			return nil, err
		}
		list = append(list, es)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return list, nil
}

func (r *ExamScheduleDB) Create(ctx context.Context, es *domain.ExamSchedule) error {
	q := `INSERT INTO exam_schedules (id, lesson_id, jenis_ujian_id, tanggal, jam_mulai, durasi_menit, pengawas1_id, pengawas2_id, ruang_id, status, academic_period_id) 
	      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := r.DB.ExecContext(ctx, q, es.ID, es.LessonID, es.JenisUjianID, es.Tanggal, es.JamMulai, es.DurasiMenit,
		es.Pengawas1ID, es.Pengawas2ID, es.RuangID, es.Status, es.AcademicPeriodID)
	return err
}

func (r *ExamScheduleDB) Update(ctx context.Context, es *domain.ExamSchedule) error {
	q := `UPDATE exam_schedules SET lesson_id=?, jenis_ujian_id=?, tanggal=?, jam_mulai=?, durasi_menit=?, pengawas1_id=?, pengawas2_id=?, ruang_id=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
	_, err := r.DB.ExecContext(ctx, q, es.LessonID, es.JenisUjianID, es.Tanggal, es.JamMulai, es.DurasiMenit,
		es.Pengawas1ID, es.Pengawas2ID, es.RuangID, es.Status, es.ID)
	return err
}

func (r *ExamScheduleDB) Delete(ctx context.Context, id string) error {
	_, err := r.DB.ExecContext(ctx, `DELETE FROM exam_schedules WHERE id = ?`, id)
	return err
}

func (r *ExamScheduleDB) GetActivePeriodID(ctx context.Context) string {
	var id string
	_ = r.DB.QueryRowContext(ctx, `SELECT id FROM academic_periods WHERE is_active = 1 LIMIT 1`).Scan(&id)
	if id == "" {
		id = "20251"
	}
	return id
}

// CreateWithSync menyimpan jadwal ujian dan menyinkronkannya ke tabel exams,
// exam_sessions, dan participant_sessions dalam satu transaksi (tx) agar siswa bisa melihatnya di Dashboard.
func (r *ExamScheduleDB) CreateWithSync(ctx context.Context, es *domain.ExamSchedule) error {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Insert ke exam_schedules
	qInsert := `INSERT INTO exam_schedules (id, lesson_id, jenis_ujian_id, tanggal, jam_mulai, durasi_menit, pengawas1_id, pengawas2_id, ruang_id, status, academic_period_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err = tx.ExecContext(ctx, qInsert, es.ID, es.LessonID, es.JenisUjianID, es.Tanggal, es.JamMulai, es.DurasiMenit,
		es.Pengawas1ID, es.Pengawas2ID, es.RuangID, es.Status, es.AcademicPeriodID)
	if err != nil {
		return err
	}

	// 2. Ambil class_id dan subject_nama dari lessons & subjects
	var classID, subjectNama string
	qLesson := `SELECT l.class_id, s.nama FROM lessons l JOIN subjects s ON s.id = l.subject_id WHERE l.id = ?`
	err = tx.QueryRowContext(ctx, qLesson, es.LessonID).Scan(&classID, &subjectNama)
	if err != nil {
		return fmt.Errorf("gagal query lesson: %w", err)
	}

	// 3. Ambil exam type nama
	var examTypeNama string
	qType := `SELECT nama FROM exam_types WHERE id = ?`
	err = tx.QueryRowContext(ctx, qType, es.JenisUjianID).Scan(&examTypeNama)
	if err != nil {
		return fmt.Errorf("gagal query exam_type: %w", err)
	}

	title := fmt.Sprintf("%s - %s", subjectNama, examTypeNama)
	startTimeStr := fmt.Sprintf("%sT%s:00+07:00", es.Tanggal, es.JamMulai)
	startTime, _ := time.Parse(time.RFC3339, startTimeStr)
	endTime := startTime.Add(time.Duration(es.DurasiMenit) * time.Minute)
	endTimeStr := endTime.Format(time.RFC3339)

	tenantID := "default" // Sesuai dengan default di skema
	examID := uuid.NewString()
	sessionID := uuid.NewString()

	// 4. Insert ke exams
	qExam := `INSERT INTO exams (id, title, duration_minutes, start_time, end_time, tenant_id, academic_period_id) 
	          VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err = tx.ExecContext(ctx, qExam, examID, title, es.DurasiMenit, startTimeStr, endTimeStr, tenantID, es.AcademicPeriodID)
	if err != nil {
		return err
	}

	// 5. Insert ke exam_sessions
	qSess := `INSERT INTO exam_sessions (id, exam_id, session_type, start_time, end_time, semester_id, status, tenant_id) 
	          VALUES (?, ?, 'REGULER', ?, ?, ?, 'SCHEDULED', ?)`
	_, err = tx.ExecContext(ctx, qSess, sessionID, examID, startTimeStr, endTimeStr, es.AcademicPeriodID, tenantID)
	if err != nil {
		return err
	}

	// 6. Insert massal ke participant_sessions
	qPart := `INSERT OR IGNORE INTO participant_sessions (participant_id, session_id, status, tenant_id)
	          SELECT cm.siswa_id, ?, 'ELIGIBLE', ? FROM class_members cm WHERE cm.class_id = ? AND cm.is_active = 1`
	_, err = tx.ExecContext(ctx, qPart, sessionID, tenantID, classID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// UpdateWithSync memperbarui jadwal dan menyinkronkan ulang waktu & peserta ujian
func (r *ExamScheduleDB) UpdateWithSync(ctx context.Context, es *domain.ExamSchedule) error {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Update exam_schedules
	qUpd := `UPDATE exam_schedules SET lesson_id=?, jenis_ujian_id=?, tanggal=?, jam_mulai=?, durasi_menit=?, pengawas1_id=?, pengawas2_id=?, ruang_id=?, status=?, academic_period_id=? WHERE id=?`
	_, err = tx.ExecContext(ctx, qUpd, es.LessonID, es.JenisUjianID, es.Tanggal, es.JamMulai, es.DurasiMenit, es.Pengawas1ID, es.Pengawas2ID, es.RuangID, es.Status, es.AcademicPeriodID, es.ID)
	if err != nil {
		return err
	}

	// 2. Ambil info mapel & kelas
	var classID, subjectNama string
	qLesson := `SELECT l.class_id, s.nama FROM lessons l JOIN subjects s ON s.id = l.subject_id WHERE l.id = ?`
	err = tx.QueryRowContext(ctx, qLesson, es.LessonID).Scan(&classID, &subjectNama)
	if err != nil {
		return fmt.Errorf("gagal query lesson: %w", err)
	}

	var examTypeNama string
	err = tx.QueryRowContext(ctx, `SELECT nama FROM exam_types WHERE id = ?`, es.JenisUjianID).Scan(&examTypeNama)
	if err != nil {
		return fmt.Errorf("gagal query exam_type: %w", err)
	}

	title := fmt.Sprintf("%s - %s", subjectNama, examTypeNama)
	startTimeStr := fmt.Sprintf("%sT%s:00+07:00", es.Tanggal, es.JamMulai)
	startTime, _ := time.Parse(time.RFC3339, startTimeStr)
	endTimeStr := startTime.Add(time.Duration(es.DurasiMenit) * time.Minute).Format(time.RFC3339)

	// 3. Cari exam_id & session_id terkait (berdasarkan title & start_time lama sebelum diubah)
	var examID, sessionID string
	qFind := `SELECT id FROM exams WHERE title = ? ORDER BY created_at DESC LIMIT 1`
	err = tx.QueryRowContext(ctx, qFind, title).Scan(&examID)
	if err != nil {
		return fmt.Errorf("gagal menemukan exam: %w", err)
	}

	err = tx.QueryRowContext(ctx, `SELECT id FROM exam_sessions WHERE exam_id = ? LIMIT 1`, examID).Scan(&sessionID)
	if err != nil {
		return fmt.Errorf("gagal menemukan session: %w", err)
	}

	// 4. Update exams
	qUpdExam := `UPDATE exams SET title=?, duration_minutes=?, start_time=?, end_time=? WHERE id=?`
	_, err = tx.ExecContext(ctx, qUpdExam, title, es.DurasiMenit, startTimeStr, endTimeStr, examID)
	if err != nil {
		return err
	}

	// 5. Update exam_sessions
	qUpdSess := `UPDATE exam_sessions SET start_time=?, end_time=?, semester_id=? WHERE id=?`
	_, err = tx.ExecContext(ctx, qUpdSess, startTimeStr, endTimeStr, es.AcademicPeriodID, sessionID)
	if err != nil {
		return err
	}

	return tx.Commit()
}
