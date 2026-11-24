package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	"cbt-engine-service/internal/cbt/domain"
)

type SiswaDB struct {
	DB *sql.DB
}

func NewSiswaDB(db *sql.DB) *SiswaDB {
	return &SiswaDB{DB: db}
}
func (r *SiswaDB) getActivePeriodID(ctx context.Context) string {
	var id string
	err := r.DB.QueryRowContext(ctx,
		`SELECT id FROM academic_periods WHERE is_active = 1 ORDER BY id DESC LIMIT 1`,
	).Scan(&id)
	if err != nil || id == "" {
		log.Printf("[SiswaDB] getActivePeriodID: no active period (err=%v) — returning empty", err)
		return ""
	}
	return id
}

const siswaCols = `id, nis, COALESCE(nisn, '') AS nisn, nama, jenis_kelamin, COALESCE(tanggal_lahir, '') AS tanggal_lahir, photo_url, created_at, updated_at`

func (r *SiswaDB) scan(row interface{ Scan(...any) error }) (*domain.Siswa, error) {
	var s domain.Siswa
	var photoURL sql.NullString
	var createdAt, updatedAt sql.NullTime
	if err := row.Scan(
		&s.ID, &s.NIS, &s.NISN, &s.Nama, &s.JenisKelamin, &s.TanggalLahir,
		&photoURL, &createdAt, &updatedAt,
	); err != nil {
		return nil, err
	}
	if photoURL.Valid {
		s.PhotoURL = &photoURL.String
	}
	return &s, nil
}

func (r *SiswaDB) List(ctx context.Context, f domain.SiswaFilter) ([]domain.Siswa, error) {
	periodID := f.AcademicPeriodID
	if periodID == "" {
		periodID = r.getActivePeriodID(ctx)
	}
	if periodID == "" {
		return nil, fmt.Errorf("list siswa: tidak ada academic_period aktif")
	}

	q := `
		SELECT 
		s.id, s.nis, COALESCE(s.nisn, '') AS nisn, s.nama, s.jenis_kelamin,
		COALESCE(s.tanggal_lahir, '') AS tanggal_lahir,
		s.photo_url,
		c.id AS class_id, c.nama AS class_nama, c.tingkat
		FROM class_members cm
		JOIN siswa s ON cm.siswa_id = s.id
		JOIN classes c ON c.id = cm.class_id
		WHERE cm.academic_period_id = ? AND cm.is_active = 1`

	args := []any{periodID}

	// Filter Kelas (jika dipilih dari dropdown)
	if f.KelasID != "" {
		q += ` AND cm.class_id = ?`
		args = append(args, f.KelasID)
	}

	// ✅ Filter Tingkat (jika dipilih dari dropdown)
	if f.Tingkat != "" {
		q += ` AND c.tingkat = ?`
		args = append(args, f.Tingkat)
	}

	// Filter Search (Nama/NIS/NISN)
	if f.Search != "" {
		q += ` AND (s.nama LIKE ? OR s.nis LIKE ? OR COALESCE(s.nisn,'') LIKE ?)`
		like := "%" + f.Search + "%"
		args = append(args, like, like, like)
	}

	q += ` ORDER BY c.tingkat ASC, c.nama ASC, s.nama ASC`

	rows, err := r.DB.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []domain.Siswa{}
	for rows.Next() {
		var s domain.Siswa
		var photoURL sql.NullString

		// Scan manual 10 kolom sesuai SELECT di atas
		if err := rows.Scan(
			&s.ID, &s.NIS, &s.NISN, &s.Nama, &s.JenisKelamin, &s.TanggalLahir,
			&photoURL, &s.KelasID, &s.KelasNama, &s.Tingkat,
		); err != nil {
			return nil, err
		}

		if photoURL.Valid {
			s.PhotoURL = &photoURL.String
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *SiswaDB) GetByID(ctx context.Context, id string) (*domain.Siswa, error) {
	q := `SELECT ` + siswaCols + ` FROM siswa WHERE id = ? LIMIT 1`
	row := r.DB.QueryRowContext(ctx, q, id)
	s, err := r.scan(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return s, err
}

func (r *SiswaDB) GetByNIS(ctx context.Context, nis string) (*domain.Siswa, error) {
	q := `SELECT ` + siswaCols + ` FROM siswa WHERE nis = ? LIMIT 1`
	row := r.DB.QueryRowContext(ctx, q, nis)
	s, err := r.scan(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return s, err
}

func (r *SiswaDB) ExistsNIS(ctx context.Context, nis string) (bool, error) {
	var n int
	err := r.DB.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM siswa WHERE nis = ?`, nis).Scan(&n)
	return n > 0, err
}

func (r *SiswaDB) ExistsNISN(ctx context.Context, nisn string) (bool, error) {
	if nisn == "" {
		return false, nil
	}
	var n int
	err := r.DB.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM siswa WHERE nisn = ?`, nisn).Scan(&n)
	return n > 0, err
}

func (r *SiswaDB) Create(ctx context.Context, s *domain.Siswa) error {
	var classPeriodID string
	// if s.KelasID != "" {
	// 	if err := r.DB.QueryRowContext(ctx,
	// 		`SELECT COALESCE(academic_period_id, '') FROM classes WHERE id = ?`,
	// 		s.KelasID,
	// 	).Scan(&classPeriodID); err != nil {
	// 		return fmt.Errorf("lookup class period: %w", err)
	// 	}
	// 	if classPeriodID == "" {
	// 		return fmt.Errorf("class %s has no academic_period_id", s.KelasID)
	// 	}
	// }
	periodID := classPeriodID
	if periodID == "" {
		// fallback: hanya untuk siswa tanpa kelas (jarang, tapi aman)
		periodID = r.getActivePeriodID(ctx)
	}

	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	const q = `INSERT INTO siswa
            (id, nis, nisn, nama, jenis_kelamin, tanggal_lahir,  photo_url)
            VALUES (?, ?, NULLIF(?, ''), ?, ?, NULLIF(?, ''), ?)`
	if _, err = tx.ExecContext(ctx, q,
		s.ID, s.NIS, s.NISN, s.Nama, s.JenisKelamin, s.TanggalLahir,
		s.PhotoURL,
	); err != nil {
		return err
	}

	if s.KelasID != "" {
		cmID := fmt.Sprintf("cm-%s-%s", s.ID, periodID)
		if _, err = tx.ExecContext(ctx, `
            INSERT INTO class_members
                (id, siswa_id, class_id, academic_period_id, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			cmID, s.ID, s.KelasID, periodID,
		); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *SiswaDB) Update(ctx context.Context, s *domain.Siswa) error {
	// ✅ PENTING: Ambil periodID SEBELUM BeginTx (hindari deadlock)
	periodID := r.getActivePeriodID(ctx)

	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Detect class change
	var oldClassID string
	_ = tx.QueryRowContext(ctx, `SELECT kelas_id FROM siswa WHERE id = ?`, s.ID).Scan(&oldClassID)

	const q = `UPDATE siswa SET
		nis = ?, nisn = NULLIF(?, ''), nama = ?, jenis_kelamin = ?,
		tanggal_lahir = NULLIF(?, ''), kelas_id = ?, kelas_nama = ?,
		status = ?, photo_url = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?`
	_, err = tx.ExecContext(ctx, q,
		s.NIS, s.NISN, s.Nama, s.JenisKelamin, s.TanggalLahir,
		s.KelasID, s.KelasNama, s.PhotoURL, s.ID,
	)
	if err != nil {
		return err
	}

	// Jika kelas berubah, simpan history
	if s.KelasID != "" && s.KelasID != oldClassID {
		// Non-aktifkan baris lama
		_, _ = tx.ExecContext(ctx,
			`UPDATE class_members SET is_active = 0, moved_at = CURRENT_TIMESTAMP WHERE siswa_id = ? AND academic_period_id = ? AND is_active = 1`,
			s.ID, periodID,
		)

		// Insert baris baru
		cmID := fmt.Sprintf("cm-%s-%s-%d", s.ID, periodID, time.Now().UnixNano())
		_, err = tx.ExecContext(ctx,
			`INSERT INTO class_members (id, siswa_id, class_id, academic_period_id, is_active) VALUES (?, ?, ?, ?, 1)`,
			cmID, s.ID, s.KelasID, periodID,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *SiswaDB) Delete(ctx context.Context, id string) error {
	_, err := r.DB.ExecContext(ctx, `DELETE FROM siswa WHERE id = ?`, id)
	return err
}

// Count — untuk dashboard stats.
func (r *SiswaDB) Count(ctx context.Context, status string) (int, error) {
	q := `SELECT COUNT(1) FROM siswa`
	args := []any{}
	if status != "" {
		q += ` WHERE status = ?`
		args = append(args, status)
	}
	var n int
	err := r.DB.QueryRowContext(ctx, q, args...).Scan(&n)
	return n, err
}

// BulkCreate — untuk import CSV (single transaction).
// BulkCreate — untuk import CSV (single transaction, atomik).
// Alur: siswa + class_members dalam satu TX.
// - Resolve active period di dalam repo (Q1: signature tetap).
// - Skip total baris tanpa KelasID (Q2b).
// - Skip duplicate NIS via ON CONFLICT (Q5) + safety net UNIQUE.
// - UPSERT class_members: jika sudah aktif di period sama, UPDATE kelasnya (Q3).
func (r *SiswaDB) BulkCreate(ctx context.Context, list []domain.Siswa) (int, error) {
	if len(list) == 0 {
		return 0, nil
	}

	// Resolve active period SEBELUM BeginTx (hindari lock/deadlock, sama pola Update()).
	periodID := r.getActivePeriodID(ctx)
	if periodID == "" {
		return 0, fmt.Errorf("bulk_create: tidak ada academic_period aktif")
	}

	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	// Prepared: INSERT siswa. Skip duplicate NIS (Q5).
	stmtSiswa, err := tx.PrepareContext(ctx, `INSERT INTO siswa
		(id, nis, nisn, nama, jenis_kelamin, tanggal_lahir, photo_url)
		VALUES (?, ?, NULLIF(?, ''), ?, ?, NULLIF(?, ''), NULLIF(?, ''))
		ON CONFLICT(nis) DO NOTHING`)
	if err != nil {
		return 0, err
	}
	defer stmtSiswa.Close()

	// Prepared: UPSERT class_members (Q3: update kelas jika sudah ada aktif di period sama).
	stmtCM, err := tx.PrepareContext(ctx, `INSERT INTO class_members
		(id, siswa_id, class_id, academic_period_id, is_active, created_at, updated_at)
		VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		ON CONFLICT(siswa_id, academic_period_id) WHERE is_active = 1
		DO UPDATE SET class_id = excluded.class_id, updated_at = CURRENT_TIMESTAMP`)
	if err != nil {
		return 0, err
	}
	defer stmtCM.Close()

	count := 0
	for _, s := range list {
		// Q2b: skip total siswa tanpa kelas.
		if s.KelasID == "" {
			continue
		}

		res, err := stmtSiswa.ExecContext(ctx,
			s.ID, s.NIS, s.NISN, s.Nama, s.JenisKelamin, s.TanggalLahir,
			s.PhotoURL,
		)
		if err != nil {
			// Safety net (Q5): skip duplicate (nis/nisn unique constraint).
			if strings.Contains(err.Error(), "UNIQUE") {
				continue
			}
			return count, fmt.Errorf("insert siswa %s: %w", s.NIS, err)
		}

		// NIS sudah ada (DO NOTHING) → RowsAffected=0 → skip class_members.
		if n, _ := res.RowsAffected(); n == 0 {
			continue
		}

		// cmID deterministik (idempoten), sama pola dengan Create().
		cmID := fmt.Sprintf("cm-%s-%s", s.ID, periodID)
		if _, err := stmtCM.ExecContext(ctx, cmID, s.ID, s.KelasID, periodID); err != nil {
			return count, fmt.Errorf("insert class_members %s: %w", s.NIS, err)
		}
		count++
	}

	if err := tx.Commit(); err != nil {
		return count, err
	}
	return count, nil
}
