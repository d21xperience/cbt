package domain

import "time"

type ParticipantCredential struct {
	NISN        string     `json:"nisn"`
	Username    string     `json:"username"`
	PasswordEnc []byte     `json:"-"`
	PasswordIV  []byte     `json:"-"`
	IsActive    bool       `json:"is_active"`
	ValidUntil  *time.Time `json:"valid_until,omitempty"`
	GeneratedAt time.Time  `json:"generated_at"`
	GeneratedBy string     `json:"generated_by,omitempty"`
}

// DTO untuk admin view (password sudah didekripsi)
type ParticipantCredentialDTO struct {
	NISN        string     `json:"nisn"`
	Username    string     `json:"username"`
	Password    string     `json:"password"` // plaintext (hanya dikirim ke admin ter-autentikasi)
	IsActive    bool       `json:"is_active"`
	ValidUntil  *time.Time `json:"valid_until,omitempty"`
	GeneratedAt time.Time  `json:"generated_at"`
}

// DTO untuk login response
type ParticipantAuthResult struct {
	ParticipantID string   `json:"participant_id"` // ← NEW: UUID dari eligible_participants
	NISN          string   `json:"nisn"`
	FullName      string   `json:"full_name"`
	RombelName    string   `json:"rombel_name"`
	ExamIDs       []string `json:"exam_ids"`
}

// Request untuk bulk generate
type GenerateCredentialsRequest struct {
	PembelajaranID string `json:"pembelajaran_id"` // exam_id yang eligible
	UsernameField  string `json:"username_field"`  // "nisn" atau "nis" (default nisn)
	PasswordLength int    `json:"password_length"` // default 6
	ValidDays      int    `json:"valid_days"`      // 0 = permanen
}
