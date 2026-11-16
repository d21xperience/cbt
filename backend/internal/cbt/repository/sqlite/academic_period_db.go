package sqlite

import (
	"cbt-engine-service/internal/cbt/domain"
	"context"
	"database/sql"
)

type AcademicPeriodDB struct{ DB *sql.DB }

func NewAcademicPeriodDB(db *sql.DB) *AcademicPeriodDB { return &AcademicPeriodDB{DB: db} }

func (r *AcademicPeriodDB) ListAll(ctx context.Context) ([]domain.AcademicPeriod, error) {
	q := `SELECT id, academic_year, semester, is_active, created_at 
	      FROM academic_periods ORDER BY academic_year DESC, semester ASC`
	rows, err := r.DB.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.AcademicPeriod
	for rows.Next() {
		var p domain.AcademicPeriod
		var active int
		rows.Scan(&p.ID, &p.AcademicYear, &p.Semester, &active, &p.CreatedAt)
		p.IsActive = active == 1
		list = append(list, p)
	}
	return list, nil
}

func (r *AcademicPeriodDB) GetActive(ctx context.Context) (*domain.AcademicPeriod, error) {
	q := `SELECT id, academic_year, semester, is_active, created_at 
	      FROM academic_periods WHERE is_active = 1 LIMIT 1`
	var p domain.AcademicPeriod
	var active int
	err := r.DB.QueryRowContext(ctx, q).Scan(&p.ID, &p.AcademicYear, &p.Semester, &active, &p.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	p.IsActive = active == 1
	return &p, nil
}

func (r *AcademicPeriodDB) GetByPeriod(ctx context.Context, ay, smt string) (*domain.AcademicPeriod, error) {
	q := `SELECT id, academic_year, semester, is_active, created_at 
	      FROM academic_periods WHERE academic_year = ? AND semester = ? LIMIT 1`
	var p domain.AcademicPeriod
	var active int
	err := r.DB.QueryRowContext(ctx, q, ay, smt).Scan(&p.ID, &p.AcademicYear, &p.Semester, &active, &p.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	p.IsActive = active == 1
	return &p, nil
}

func (r *AcademicPeriodDB) Create(ctx context.Context, p *domain.AcademicPeriod) error {
	_, err := r.DB.ExecContext(ctx,
		`INSERT INTO academic_periods (id, academic_year, semester, is_active) VALUES (?, ?, ?, ?)`,
		p.ID, p.AcademicYear, p.Semester, boolToIntOrZero(p.IsActive))
	return err
}

func (r *AcademicPeriodDB) SetActive(ctx context.Context, id string) error {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `UPDATE academic_periods SET is_active = 0`)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `UPDATE academic_periods SET is_active = 1 WHERE id = ?`, id)
	if err != nil {
		return err
	}
	return tx.Commit()
}

// LogRollover — audit log
func (r *AcademicPeriodDB) LogRollover(ctx context.Context, log map[string]any) error {
	_, err := r.DB.ExecContext(ctx,
		`INSERT INTO rollover_logs (id, from_period, to_period, classes_copied, students_copied, lessons_copied, graduates_count) 
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		log["id"], log["from_period"], log["to_period"],
		log["classes_copied"], log["students_copied"], log["lessons_copied"], log["graduates_count"])
	return err
}

func boolToIntOrZero(b bool) int {
	if b {
		return 1
	}
	return 0
}
