package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"cbt-engine-service/internal/platform/domain"

	"github.com/google/uuid"
)

type KeahlianDB struct {
	DB *sql.DB
}

func NewKeahlianDB(db *sql.DB) *KeahlianDB {
	return &KeahlianDB{DB: db}
}

// ============================================
// BIDANG KEAHLIAN
// ============================================

func (r *KeahlianDB) ListBidang(ctx context.Context) ([]domain.BidangKeahlian, error) {
	const q = `
		SELECT id, nama, COALESCE(deskripsi, ''), sort_order, created_at
		FROM master_bidang_keahlian
		ORDER BY sort_order ASC, nama ASC`

	rows, err := r.DB.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.BidangKeahlian
	for rows.Next() {
		var b domain.BidangKeahlian
		var createdAt string
		if err := rows.Scan(&b.ID, &b.Nama, &b.Deskripsi, &b.SortOrder, &createdAt); err != nil {
			return nil, err
		}
		b.CreatedAt = parseTime(createdAt)
		out = append(out, b)
	}
	return out, rows.Err()
}

// ============================================
// PROGRAM KEAHLIAN
// ============================================

// ListProgram — list semua, optional filter by bidang
func (r *KeahlianDB) ListProgram(ctx context.Context, bidangID string, onlyDefault bool) ([]domain.ProgramKeahlian, error) {
	q := `
		SELECT p.id, p.bidang_id, p.kode, p.nama,
		       COALESCE(p.deskripsi, '') AS deskripsi,
		       p.is_default, p.is_custom,
		       COALESCE(p.created_by, '') AS created_by,
		       p.sort_order, p.created_at,
		       COALESCE(b.nama, '') AS bidang_nama
		FROM master_program_keahlian p
		LEFT JOIN master_bidang_keahlian b ON b.id = p.bidang_id
		WHERE 1=1`
	args := []any{}

	if bidangID != "" {
		q += ` AND p.bidang_id = ?`
		args = append(args, bidangID)
	}
	if onlyDefault {
		q += ` AND p.is_default = 1`
	}
	q += ` ORDER BY p.bidang_id ASC, p.sort_order ASC, p.nama ASC`

	rows, err := r.DB.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.ProgramKeahlian
	for rows.Next() {
		var p domain.ProgramKeahlian
		var isDefault, isCustom int
		var createdAt string
		if err := rows.Scan(
			&p.ID, &p.BidangID, &p.Kode, &p.Nama, &p.Deskripsi,
			&isDefault, &isCustom, &p.CreatedBy,
			&p.SortOrder, &createdAt, &p.BidangNama,
		); err != nil {
			return nil, err
		}
		p.IsDefault = isDefault == 1
		p.IsCustom = isCustom == 1
		p.CreatedAt = parseTime(createdAt)
		out = append(out, p)
	}
	return out, rows.Err()
}

// FindByKode — cari berdasarkan kode (TKJ, TKR, ...)
func (r *KeahlianDB) FindByKode(ctx context.Context, kode string) (*domain.ProgramKeahlian, error) {
	const q = `
		SELECT p.id, p.bidang_id, p.kode, p.nama,
		       COALESCE(p.deskripsi, ''),
		       p.is_default, p.is_custom,
		       COALESCE(p.created_by, ''),
		       p.sort_order, p.created_at,
		       COALESCE(b.nama, '')
		FROM master_program_keahlian p
		LEFT JOIN master_bidang_keahlian b ON b.id = p.bidang_id
		WHERE UPPER(p.kode) = UPPER(?) LIMIT 1`

	row := r.DB.QueryRowContext(ctx, q, kode)
	var p domain.ProgramKeahlian
	var isDefault, isCustom int
	var createdAt string

	err := row.Scan(
		&p.ID, &p.BidangID, &p.Kode, &p.Nama, &p.Deskripsi,
		&isDefault, &isCustom, &p.CreatedBy,
		&p.SortOrder, &createdAt, &p.BidangNama,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	p.IsDefault = isDefault == 1
	p.IsCustom = isCustom == 1
	p.CreatedAt = parseTime(createdAt)
	return &p, nil
}

// FindOrCreateProgram — findOrCreate pattern
//  1. Cari by kode (case-insensitive)
//  2. Kalau ada → return existing
//  3. Kalau tidak → INSERT dengan is_custom=1
func (r *KeahlianDB) FindOrCreateProgram(
	ctx context.Context,
	req domain.FindOrCreateProgramRequest,
	createdBy string,
) (*domain.ProgramKeahlian, bool, error) {
	kode := strings.ToUpper(strings.TrimSpace(req.Kode))
	if kode == "" {
		return nil, false, fmt.Errorf("kode wajib")
	}

	// 1. Try find
	existing, err := r.FindByKode(ctx, kode)
	if err != nil {
		return nil, false, err
	}
	if existing != nil {
		return existing, false, nil // found, not created
	}

	// 2. Validate bidang
	bidangID := req.BidangID
	if bidangID == "" {
		bidangID = "TI" // fallback
	}
	var exists int
	_ = r.DB.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM master_bidang_keahlian WHERE id = ?`,
		bidangID).Scan(&exists)
	if exists == 0 {
		return nil, false, fmt.Errorf("bidang '%s' tidak ditemukan", bidangID)
	}

	// 3. INSERT
	id := uuid.NewString()
	const q = `
		INSERT INTO master_program_keahlian
		(id, bidang_id, kode, nama, deskripsi, is_default, is_custom, created_by, sort_order)
		VALUES (?, ?, ?, ?, ?, 0, 1, ?, 999)`

	_, err = r.DB.ExecContext(ctx, q,
		id, bidangID, kode, req.Nama, req.Deskripsi, createdBy)
	if err != nil {
		return nil, false, err
	}

	// 4. Return
	created, err := r.FindByKode(ctx, kode)
	return created, true, err
}

// ============================================
// TENANT PROGRAMS (mapping)
// ============================================

func (r *KeahlianDB) AssignProgramToTenant(ctx context.Context, tenantID, programID string) error {
	const q = `
		INSERT INTO tenant_programs (tenant_id, program_id)
		VALUES (?, ?)
		ON CONFLICT(tenant_id, program_id) DO NOTHING`
	_, err := r.DB.ExecContext(ctx, q, tenantID, programID)
	return err
}

func (r *KeahlianDB) ListTenantPrograms(ctx context.Context, tenantID string) ([]domain.ProgramKeahlian, error) {
	const q = `
		SELECT p.id, p.bidang_id, p.kode, p.nama,
		       COALESCE(p.deskripsi, ''),
		       p.is_default, p.is_custom,
		       COALESCE(p.created_by, ''),
		       p.sort_order, p.created_at,
		       COALESCE(b.nama, '')
		FROM tenant_programs tp
		JOIN master_program_keahlian p ON p.id = tp.program_id
		LEFT JOIN master_bidang_keahlian b ON b.id = p.bidang_id
		WHERE tp.tenant_id = ?
		ORDER BY p.bidang_id ASC, p.sort_order ASC`

	rows, err := r.DB.QueryContext(ctx, q, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.ProgramKeahlian
	for rows.Next() {
		var p domain.ProgramKeahlian
		var isDefault, isCustom int
		var createdAt string
		if err := rows.Scan(
			&p.ID, &p.BidangID, &p.Kode, &p.Nama, &p.Deskripsi,
			&isDefault, &isCustom, &p.CreatedBy,
			&p.SortOrder, &createdAt, &p.BidangNama,
		); err != nil {
			return nil, err
		}
		p.IsDefault = isDefault == 1
		p.IsCustom = isCustom == 1
		p.CreatedAt = parseTime(createdAt)
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *KeahlianDB) RemoveProgramFromTenant(ctx context.Context, tenantID, programID string) error {
	_, err := r.DB.ExecContext(ctx,
		`DELETE FROM tenant_programs WHERE tenant_id = ? AND program_id = ?`,
		tenantID, programID)
	return err
}

// helper — parse time (reuse existing parseTime)
var _ = time.Now
