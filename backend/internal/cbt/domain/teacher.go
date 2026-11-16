package domain

import "errors"

type Teacher struct {
	ID                 string   `json:"id"`
	Nama               string   `json:"nama"`
	NIP                string   `json:"nip,omitempty"`
	Email              string   `json:"email,omitempty"`
	Username           string   `json:"username"`
	Password           string   `json:"password,omitempty"` // response only (hasil decrypt, plaintext di-transit)
	JenisKelamin       string   `json:"jenis_kelamin"`
	Status             string   `json:"status"`
	TeachingSubjectIDs []string `json:"teaching_subject_ids"`
	IsHomeroom         bool     `json:"is_homeroom"`
	HomeroomClassID    string   `json:"homeroom_class_id,omitempty"`
	HomeroomClassName  string   `json:"homeroom_class_nama,omitempty"`
	HasLoggedIn        bool     `json:"has_logged_in"`

	// Kolom internal — tidak pernah di-serialize ke JSON
	PasswordHash  string `json:"-"` // bcrypt hash untuk login
	PasswordEnc   []byte `json:"-"` // ciphertext at-rest (AES-256-GCM)
	PasswordIV    []byte `json:"-"` // nonce/IV at-rest
	PasswordPlain string `json:"-"` // DEPRECATED — drop setelah migration 000036
}

var ErrTeacherInvalidInput = errors.New("teacher: nama wajib diisi")
