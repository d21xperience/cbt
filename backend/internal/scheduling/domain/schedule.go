// internal/scheduling/domain/schedule.go
package domain

// ValidateParticipantRequest adalah payload yang dikirim CBT Engine ke SIAKAD
type ValidateParticipantRequest struct {
	NISN           string `json:"nisn"`
	PembelajaranID string `json:"pembelajaran_id"` // UUID dari tabel pembelajaran Dapodik
	SemesterID     string `json:"semester_id"`     // misal: "20231"
}

// ValidateParticipantResponse adalah balasan dari SIAKAD ke CBT Engine
type ValidateParticipantResponse struct {
	IsValid       bool   `json:"is_valid"`
	ParticipantID string `json:"participant_id"` // UUID peserta_didik (untuk dipakai di CBT)
	Name          string `json:"name"`
	RombelName    string `json:"rombel_name"`
	SubjectName   string `json:"subject_name"`
	Message       string `json:"message"`

	Source         string `json:"source"`          // 'SIAKAD' atau 'EXTERNAL'
	ExternalSchool string `json:"external_school"` // Nama sekolah asal (Kosong jika SIAKAD)

}
