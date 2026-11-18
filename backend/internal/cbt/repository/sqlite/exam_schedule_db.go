package sqlite

import (
	"cbt-engine-service/internal/cbt/domain"
	"context"
	"database/sql"
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
