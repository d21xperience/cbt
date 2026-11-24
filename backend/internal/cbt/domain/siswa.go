// Package domain — entity Siswa (master data siswa per tenant).
// BCR-1: source = Frontend mock F0.5a-2 / F1a-1.
package domain

import "errors"

var (
	ErrSiswaNotFound       = errors.New("siswa_not_found")
	ErrSiswaNISDuplicated  = errors.New("nis_taken")
	ErrSiswaNISNDuplicated = errors.New("nisn_taken")
	ErrSiswaInvalidInput   = errors.New("invalid_input")
)

// Siswa — entity master siswa (tabel `siswa`, migration 000018).
// JSON tag MATCH frontend mock (studentsData.js).
// Catatan: ExamPassword TIDAK disimpan di tabel siswa —
// di-decrypt dari participant_credentials saat read (Opsi A).
type Siswa struct {
	ID           string  `json:"id"`
	NIS          string  `json:"nis"`
	NISN         string  `json:"nisn,omitempty"`
	Nama         string  `json:"nama"`
	JenisKelamin string  `json:"jenis_kelamin"`
	TanggalLahir string  `json:"tanggal_lahir,omitempty"`
	PhotoURL     *string `json:"photo_url"`
	KelasID      string  `json:"kelas_id"`
	KelasNama    string  `json:"kelas_nama"`
	Tingkat      int     `json:"tingkat"`

	// Field berikut di-inject saat read, tidak dari tabel siswa:
	ExamPassword string `json:"exam_password,omitempty"` // decrypt dari participant_credentials
	TenantSlug   string `json:"tenant_slug,omitempty"`   // dari context
	Source       string `json:"source,omitempty"`        // selalu "SISWA"
}

// SiswaFilter — query params untuk list.
type SiswaFilter struct {
	Search           string
	KelasID          string
	Status           string
	Tingkat          string
	AcademicYear     string
	Semester         string
	AcademicPeriodID string
}
