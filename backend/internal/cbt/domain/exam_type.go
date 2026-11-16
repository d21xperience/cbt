package domain

import "errors"

var (
	ErrExamTypeNotFound  = errors.New("exam_type_not_found")
	ErrExamTypeInvalid   = errors.New("invalid_exam_type_input")
	ErrExamTypeKodeTaken = errors.New("kode_taken")
	ErrExamTypeInUse     = errors.New("type_in_use")
)

type ExamType struct {
	ID        string `json:"id"`
	Kode      string `json:"kode"`
	Nama      string `json:"nama"`
	Deskripsi string `json:"deskripsi,omitempty"`
	CreatedAt string `json:"created_at,omitempty"`
	UpdatedAt string `json:"updated_at,omitempty"`
}
