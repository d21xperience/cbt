package domain

type EligibleParticipant struct {
	ParticipantID  string `json:"participant_id"`
	NISN           string `json:"nisn"` // Bisa NISN asli atau No. ID Eksternal
	Name           string `json:"name"`
	RombelName     string `json:"rombel_name"` // Kelas/Rombel asal
	SubjectName    string `json:"subject_name"`
	PembelajaranID string `json:"pembelajaran_id"` // Kosongkan untuk eksternal
	SemesterID     string `json:"semester_id"`
	Source         string `json:"source"` // 'SIAKAD' atau 'EXTERNAL'
	ExternalSchool string `json:"external_school"`
	ExamID         string `json:"exam_id"` // Wajib untuk eksternal
}
