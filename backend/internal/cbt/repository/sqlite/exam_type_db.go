package sqlite

import (
	"cbt-engine-service/internal/cbt/domain"
	"context"
	"database/sql"
)

type ExamTypeDB struct{ DB *sql.DB }

func NewExamTypeDB(db *sql.DB) *ExamTypeDB { return &ExamTypeDB{DB: db} }

func (r *ExamTypeDB) List(ctx context.Context) ([]domain.ExamType, error) {
	q := `SELECT id, kode, nama, COALESCE(deskripsi,'') FROM exam_types ORDER BY kode ASC`
	rows, err := r.DB.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []domain.ExamType
	for rows.Next() {
		var e domain.ExamType
		rows.Scan(&e.ID, &e.Kode, &e.Nama, &e.Deskripsi)
		list = append(list, e)
	}
	return list, nil
}

func (r *ExamTypeDB) GetByID(ctx context.Context, id string) (*domain.ExamType, error) {
	var e domain.ExamType
	err := r.DB.QueryRowContext(ctx, `SELECT id, kode, nama, COALESCE(deskripsi,'') FROM exam_types WHERE id = ?`, id).Scan(&e.ID, &e.Kode, &e.Nama, &e.Deskripsi)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &e, err
}

func (r *ExamTypeDB) ExistsKode(ctx context.Context, kode string, excludeID string) (bool, error) {
	var count int
	err := r.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM exam_types WHERE LOWER(kode) = LOWER(?) AND id != ?`, kode, excludeID).Scan(&count)
	return count > 0, err
}

func (r *ExamTypeDB) Create(ctx context.Context, e *domain.ExamType) error {
	_, err := r.DB.ExecContext(ctx, `INSERT INTO exam_types (id, kode, nama, deskripsi) VALUES (?, ?, ?, ?)`, e.ID, e.Kode, e.Nama, e.Deskripsi)
	return err
}

func (r *ExamTypeDB) Update(ctx context.Context, e *domain.ExamType) error {
	_, err := r.DB.ExecContext(ctx, `UPDATE exam_types SET kode=?, nama=?, deskripsi=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, e.Kode, e.Nama, e.Deskripsi, e.ID)
	return err
}

func (r *ExamTypeDB) Delete(ctx context.Context, id string) error {
	_, err := r.DB.ExecContext(ctx, `DELETE FROM exam_types WHERE id = ?`, id)
	return err
}
