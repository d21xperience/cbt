package sqlite

import (
	"cbt-engine-service/internal/cbt/domain"
	"context"
	"database/sql"
)

type ClassDB struct{ DB *sql.DB }

func NewClassDB(db *sql.DB) *ClassDB { return &ClassDB{DB: db} }

func (r *ClassDB) ListByPeriodID(ctx context.Context, periodID string) ([]domain.Class, error) {
	q := `SELECT id, nama, tingkat, COALESCE(kurikulum,''), COALESCE(jenis_rombel,''), 
	             COALESCE(jurusan_id,''), COALESCE(wali_kelas_id,''), COALESCE(wali_kelas_nama,''), 
	             COALESCE(ruang_id,''), COALESCE(ruang_nama,''), jumlah_siswa, 
	             COALESCE(academic_period_id,''), created_at, updated_at 
	      FROM classes 
	      WHERE academic_period_id = ?
	      ORDER BY tingkat ASC, nama ASC`
	rows, err := r.DB.QueryContext(ctx, q, periodID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []domain.Class
	for rows.Next() {
		var c domain.Class
		rows.Scan(&c.ID, &c.Nama, &c.Tingkat, &c.Kurikulum, &c.JenisRombel,
			&c.ProgramKeahlianID, &c.WaliKelasID, &c.WaliKelasNama,
			&c.RuangID, &c.RuangNama, &c.JumlahSiswa,
			&c.AcademicPeriodID, &c.CreatedAt, &c.UpdatedAt)
		list = append(list, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err // sesuaikan nilai return dengan signature fungsi masing-masing
	}
	return list, nil
}

func (r *ClassDB) List(ctx context.Context) ([]domain.Class, error) {
	q := `SELECT id, nama, tingkat, COALESCE(kurikulum,''), COALESCE(jenis_rombel,''), 
	             COALESCE(jurusan_id,''), COALESCE(wali_kelas_id,''), COALESCE(wali_kelas_nama,''), 
	             COALESCE(ruang_id,''), COALESCE(ruang_nama,''), jumlah_siswa, 
	             COALESCE(academic_period_id,''), created_at, updated_at 
	      FROM classes ORDER BY tingkat ASC, nama ASC`
	rows, err := r.DB.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []domain.Class
	for rows.Next() {
		var c domain.Class
		rows.Scan(&c.ID, &c.Nama, &c.Tingkat, &c.Kurikulum, &c.JenisRombel,
			&c.ProgramKeahlianID, &c.WaliKelasID, &c.WaliKelasNama,
			&c.RuangID, &c.RuangNama, &c.JumlahSiswa,
			&c.AcademicPeriodID, &c.CreatedAt, &c.UpdatedAt)
		list = append(list, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err // sesuaikan nilai return dengan signature fungsi masing-masing
	}
	return list, nil
}

func (r *ClassDB) GetByID(ctx context.Context, id string) (*domain.Class, error) {
	q := `SELECT id, nama, tingkat, COALESCE(kurikulum,''), COALESCE(jenis_rombel,''), 
	             COALESCE(jurusan_id,''), COALESCE(wali_kelas_id,''), COALESCE(wali_kelas_nama,''), 
	             COALESCE(ruang_id,''), COALESCE(ruang_nama,''), jumlah_siswa,
	             COALESCE(academic_period_id,'')
	      FROM classes WHERE id = ?`
	var c domain.Class
	err := r.DB.QueryRowContext(ctx, q, id).Scan(&c.ID, &c.Nama, &c.Tingkat, &c.Kurikulum, &c.JenisRombel,
		&c.ProgramKeahlianID, &c.WaliKelasID, &c.WaliKelasNama,
		&c.RuangID, &c.RuangNama, &c.JumlahSiswa, &c.AcademicPeriodID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &c, err
}

func (r *ClassDB) Create(ctx context.Context, c *domain.Class) error {
	q := `INSERT INTO classes (id, nama, tingkat, kurikulum, jenis_rombel, jurusan_id, 
	      wali_kelas_id, wali_kelas_nama, ruang_id, ruang_nama, jumlah_siswa, academic_period_id) 
	      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := r.DB.ExecContext(ctx, q, c.ID, c.Nama, c.Tingkat, c.Kurikulum, c.JenisRombel,
		c.ProgramKeahlianID, c.WaliKelasID, c.WaliKelasNama,
		c.RuangID, c.RuangNama, c.JumlahSiswa, c.AcademicPeriodID)
	return err
}

func (r *ClassDB) Update(ctx context.Context, c *domain.Class) error {
	q := `UPDATE classes SET nama=?, tingkat=?, kurikulum=?, jenis_rombel=?, jurusan_id=?, 
	      wali_kelas_id=?, wali_kelas_nama=?, ruang_id=?, ruang_nama=?, updated_at=CURRENT_TIMESTAMP 
	      WHERE id=?`
	_, err := r.DB.ExecContext(ctx, q, c.Nama, c.Tingkat, c.Kurikulum, c.JenisRombel,
		c.ProgramKeahlianID, c.WaliKelasID, c.WaliKelasNama,
		c.RuangID, c.RuangNama, c.ID)
	return err
}

func (r *ClassDB) Delete(ctx context.Context, id string) error {
	_, err := r.DB.ExecContext(ctx, `DELETE FROM classes WHERE id = ?`, id)
	return err
}

func (r *ClassDB) GetAllByPeriod(ctx context.Context, periodID string) ([]domain.Class, error) {
	return r.ListByPeriodID(ctx, periodID)
}
