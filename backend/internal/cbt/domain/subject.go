package domain

import "errors"

var (
	ErrSubjectNotFound  = errors.New("subject_not_found")
	ErrSubjectInvalid   = errors.New("invalid_subject_input")
	ErrSubjectInUse     = errors.New("subject_in_use")
	ErrSubjectKodeTaken = errors.New("kode_taken")
)

type Subject struct {
	ID          string `json:"id"`
	Kode        string `json:"kode"`
	Nama        string `json:"nama"`
	NamaSingkat string `json:"nama_singkat"`
	Kelompok    string `json:"kelompok"`
	Tingkat     string `json:"tingkat"`
	JurusanID   string `json:"jurusan_id,omitempty"`
	CreatedAt   string `json:"created_at,omitempty"`
	UpdatedAt   string `json:"updated_at,omitempty"`
}
