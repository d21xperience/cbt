// internal/cbt/repository/sqlite/school_profile_db.go
// BCR-2: Repository SchoolProfile (SQLite, per-tenant).
package sqlite

import (
	"context"
	"database/sql"

	"cbt-engine-service/internal/cbt/domain"
)

// SchoolProfileDB — akses tabel `school_profile` (1 row per tenant).
type SchoolProfileDB struct {
	DB *sql.DB
}

func NewSchoolProfileDB(db *sql.DB) *SchoolProfileDB {
	return &SchoolProfileDB{DB: db}
}

// Get — baca singleton row. Auto-init kalau belum ada (resilient).
func (r *SchoolProfileDB) Get(ctx context.Context) (*domain.SchoolProfile, error) {
	q := `SELECT nss, kode_sekolah, alamat_jalan, alamat_desa, alamat_kecamatan,
	             alamat_kabupaten, alamat_provinsi, alamat_kode_pos, telp, email,
	             website, kepala_sekolah_nama, kepala_sekolah_nip, logo_url, updated_at
	      FROM school_profile WHERE id = 'singleton' LIMIT 1`
	row := r.DB.QueryRowContext(ctx, q)

	var p domain.SchoolProfile
	var upd sql.NullString
	err := row.Scan(
		&p.NSS, &p.KodeSekolah, &p.AlamatJalan, &p.AlamatDesa, &p.AlamatKecamatan,
		&p.AlamatKabupaten, &p.AlamatProvinsi, &p.AlamatKodePos, &p.Telp, &p.Email,
		&p.Website, &p.KepalaSekolahNama, &p.KepalaSekolahNIP, &p.LogoURL, &upd,
	)
	if err == sql.ErrNoRows {
		// auto-init singleton (idempotent)
		if _, insErr := r.DB.ExecContext(ctx,
			`INSERT OR IGNORE INTO school_profile (id) VALUES ('singleton')`); insErr != nil {
			return nil, insErr
		}
		return &domain.SchoolProfile{}, nil
	}
	if err != nil {
		return nil, err
	}
	if upd.Valid {
		p.UpdatedAt = upd.String
	}
	return &p, nil
}

// Upsert — insert/update singleton. updated_at selalu server-controlled.
func (r *SchoolProfileDB) Upsert(ctx context.Context, p *domain.SchoolProfile) error {
	q := `INSERT INTO school_profile (
	          id, nss, kode_sekolah, alamat_jalan, alamat_desa, alamat_kecamatan,
	          alamat_kabupaten, alamat_provinsi, alamat_kode_pos, telp, email,
	          website, kepala_sekolah_nama, kepala_sekolah_nip, logo_url, updated_at
	      ) VALUES ('singleton', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
	      ON CONFLICT(id) DO UPDATE SET
	          nss                 = excluded.nss,
	          kode_sekolah        = excluded.kode_sekolah,
	          alamat_jalan        = excluded.alamat_jalan,
	          alamat_desa         = excluded.alamat_desa,
	          alamat_kecamatan    = excluded.alamat_kecamatan,
	          alamat_kabupaten    = excluded.alamat_kabupaten,
	          alamat_provinsi     = excluded.alamat_provinsi,
	          alamat_kode_pos     = excluded.alamat_kode_pos,
	          telp                = excluded.telp,
	          email               = excluded.email,
	          website             = excluded.website,
	          kepala_sekolah_nama = excluded.kepala_sekolah_nama,
	          kepala_sekolah_nip  = excluded.kepala_sekolah_nip,
	          logo_url            = excluded.logo_url,
	          updated_at          = CURRENT_TIMESTAMP`
	_, err := r.DB.ExecContext(ctx, q,
		p.NSS, p.KodeSekolah, p.AlamatJalan, p.AlamatDesa, p.AlamatKecamatan,
		p.AlamatKabupaten, p.AlamatProvinsi, p.AlamatKodePos, p.Telp, p.Email,
		p.Website, p.KepalaSekolahNama, p.KepalaSekolahNIP, p.LogoURL,
	)
	return err
}
