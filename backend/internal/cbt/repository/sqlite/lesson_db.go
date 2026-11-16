package sqlite

import (
	"cbt-engine-service/internal/cbt/domain"
	"context"
	"database/sql"
)

type LessonDB struct{ DB *sql.DB }

func NewLessonDB(db *sql.DB) *LessonDB { return &LessonDB{DB: db} }

func (r *LessonDB) List(ctx context.Context) ([]domain.Lesson, error) {
	q := `
		SELECT l.id, l.subject_id, l.class_id, l.teacher_id,
		       COALESCE(s.kode, ''), COALESCE(s.nama, ''),
		       COALESCE(c.nama, ''), COALESCE(t.nama, ''),
		       COALESCE(l.academic_period_id, '')
		FROM lessons l
		LEFT JOIN subjects s ON s.id = l.subject_id
		LEFT JOIN classes c ON c.id = l.class_id
		LEFT JOIN teachers t ON t.id = l.teacher_id
		ORDER BY c.nama ASC, s.nama ASC`
	rows, err := r.DB.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []domain.Lesson
	for rows.Next() {
		var l domain.Lesson
		rows.Scan(&l.ID, &l.SubjectID, &l.ClassID, &l.TeacherID,
			&l.SubjectKode, &l.SubjectNama, &l.ClassName, &l.TeacherNama, &l.AcademicPeriodID)
		list = append(list, l)
	}
	return list, nil
}

func (r *LessonDB) ListByPeriodID(ctx context.Context, periodID string) ([]domain.Lesson, error) {
	q := `
		SELECT l.id, l.subject_id, l.class_id, l.teacher_id,
		       COALESCE(s.kode, ''), COALESCE(s.nama, ''),
		       COALESCE(c.nama, ''), COALESCE(t.nama, ''),
		       COALESCE(l.academic_period_id, '')
		FROM lessons l
		LEFT JOIN subjects s ON s.id = l.subject_id
		LEFT JOIN classes c ON c.id = l.class_id
		LEFT JOIN teachers t ON t.id = l.teacher_id
		WHERE l.academic_period_id = ?
		ORDER BY c.nama ASC, s.nama ASC`
	rows, err := r.DB.QueryContext(ctx, q, periodID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []domain.Lesson
	for rows.Next() {
		var l domain.Lesson
		rows.Scan(&l.ID, &l.SubjectID, &l.ClassID, &l.TeacherID,
			&l.SubjectKode, &l.SubjectNama, &l.ClassName, &l.TeacherNama, &l.AcademicPeriodID)
		list = append(list, l)
	}
	return list, nil
}

func (r *LessonDB) GetByID(ctx context.Context, id string) (*domain.Lesson, error) {
	q := `SELECT id, subject_id, class_id, teacher_id, COALESCE(academic_period_id,'') FROM lessons WHERE id = ?`
	var l domain.Lesson
	err := r.DB.QueryRowContext(ctx, q, id).Scan(&l.ID, &l.SubjectID, &l.ClassID, &l.TeacherID, &l.AcademicPeriodID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &l, err
}

func (r *LessonDB) Exists(ctx context.Context, subjectID, classID, periodID, excludeID string) (bool, error) {
	var count int
	err := r.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM lessons WHERE subject_id=? AND class_id=? AND academic_period_id=? AND id != ?`,
		subjectID, classID, periodID, excludeID).Scan(&count)
	return count > 0, err
}

func (r *LessonDB) Create(ctx context.Context, l *domain.Lesson) error {
	q := `INSERT INTO lessons (id, subject_id, class_id, teacher_id, academic_period_id) VALUES (?, ?, ?, ?, ?)`
	_, err := r.DB.ExecContext(ctx, q, l.ID, l.SubjectID, l.ClassID, l.TeacherID, l.AcademicPeriodID)
	return err
}

func (r *LessonDB) Update(ctx context.Context, l *domain.Lesson) error {
	q := `UPDATE lessons SET subject_id=?, class_id=?, teacher_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
	_, err := r.DB.ExecContext(ctx, q, l.SubjectID, l.ClassID, l.TeacherID, l.ID)
	return err
}

func (r *LessonDB) Delete(ctx context.Context, id string) error {
	_, err := r.DB.ExecContext(ctx, `DELETE FROM lessons WHERE id = ?`, id)
	return err
}
