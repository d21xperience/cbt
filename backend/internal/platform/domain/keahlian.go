package domain

import "time"

// BidangKeahlian — kategori besar (Teknologi Informasi, Otomotif, ...)
type BidangKeahlian struct {
	ID        string    `json:"id"` // kode: 'TI'
	Nama      string    `json:"nama"`
	Deskripsi string    `json:"deskripsi,omitempty"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}

// ProgramKeahlian — jurusan (TKJ, TKR, ...)
type ProgramKeahlian struct {
	ID        string    `json:"id"`
	BidangID  string    `json:"bidang_id"`
	Kode      string    `json:"kode"`
	Nama      string    `json:"nama"`
	Deskripsi string    `json:"deskripsi,omitempty"`
	IsDefault bool      `json:"is_default"`
	IsCustom  bool      `json:"is_custom"`
	CreatedBy string    `json:"created_by,omitempty"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`

	// Populated saat query dengan JOIN
	BidangNama string `json:"bidang_nama,omitempty"`
}

// ProgramKeahlianDTO — response untuk dropdown publik
type ProgramKeahlianDTO struct {
	ID         string `json:"id"`
	Kode       string `json:"kode"`
	Nama       string `json:"nama"`
	BidangID   string `json:"bidang_id"`
	BidangNama string `json:"bidang_nama"`
}

// FindOrCreateProgramRequest — request findOrCreate program
type FindOrCreateProgramRequest struct {
	Kode      string `json:"kode"`
	Nama      string `json:"nama"`
	BidangID  string `json:"bidang_id,omitempty"` // kalau kosong → 'TI'
	Deskripsi string `json:"deskripsi,omitempty"`
}
