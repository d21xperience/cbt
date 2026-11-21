package sqlite

import (
	"cbt-engine-service/internal/cbt/domain"
	"context"
	"database/sql"
)

type SubjectDB struct{ DB *sql.DB }

func NewSubjectDB(db *sql.DB) *SubjectDB { return &SubjectDB{DB: db} }

func (r *SubjectDB) List(ctx context.Context) ([]domain.Subject, error) {
	q := `SELECT id, kode, nama, nama_singkat, kelompok, tingkat, COALESCE(jurusan_id,'') FROM subjects ORDER BY tingkat ASC, nama ASC`
	rows, err := r.DB.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []domain.Subject
	for rows.Next() {
		var s domain.Subject
		rows.Scan(&s.ID, &s.Kode, &s.Nama, &s.NamaSingkat, &s.Kelompok, &s.Tingkat, &s.JurusanID)
		list = append(list, s)
	}
	if err := rows.Err(); err != nil {
		return nil, err // sesuaikan nilai return dengan signature fungsi masing-masing
	}
	return list, nil
}

func (r *SubjectDB) GetByID(ctx context.Context, id string) (*domain.Subject, error) {
	q := `SELECT id, kode, nama, nama_singkat, kelompok, tingkat, COALESCE(jurusan_id,'') FROM subjects WHERE id = ?`
	var s domain.Subject
	err := r.DB.QueryRowContext(ctx, q, id).Scan(&s.ID, &s.Kode, &s.Nama, &s.NamaSingkat, &s.Kelompok, &s.Tingkat, &s.JurusanID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &s, err
}

func (r *SubjectDB) ExistsKode(ctx context.Context, kode string, excludeID string) (bool, error) {
	var count int
	err := r.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM subjects WHERE LOWER(kode) = LOWER(?) AND id != ?`, kode, excludeID).Scan(&count)
	return count > 0, err
}

func (r *SubjectDB) Create(ctx context.Context, s *domain.Subject) error {
	q := `INSERT INTO subjects (id, kode, nama, nama_singkat, kelompok, tingkat, jurusan_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err := r.DB.ExecContext(ctx, q, s.ID, s.Kode, s.Nama, s.NamaSingkat, s.Kelompok, s.Tingkat, s.JurusanID)
	return err
}

func (r *SubjectDB) Update(ctx context.Context, s *domain.Subject) error {
	q := `UPDATE subjects SET kode=?, nama=?, nama_singkat=?, kelompok=?, tingkat=?, jurusan_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
	_, err := r.DB.ExecContext(ctx, q, s.Kode, s.Nama, s.NamaSingkat, s.Kelompok, s.Tingkat, s.JurusanID, s.ID)
	return err
}

func (r *SubjectDB) Delete(ctx context.Context, id string) error {
	_, err := r.DB.ExecContext(ctx, `DELETE FROM subjects WHERE id = ?`, id)
	return err
}
