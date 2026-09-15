package domain

import "time"

// SemesterArchive adalah payload yang dikirim ke SIAKAD
type SemesterArchive struct {
	SchoolID   string       `json:"school_id"`
	SemesterID string       `json:"semester_id"`
	ArchivedAt time.Time    `json:"archived_at"`
	Results    []ExamResult `json:"results"`
}

type ExamResult struct {
	ParticipantID  string    `json:"participant_id"`
	NISN           string    `json:"nisn"`
	Name           string    `json:"name"`
	ExamID         string    `json:"exam_id"`
	ExamName       string    `json:"exam_name"`
	SessionType    string    `json:"session_type"` // REGULER / SUSULAN
	TotalQuestions int       `json:"total_questions"`
	CorrectAnswers int       `json:"correct_answers"`
	FinalScore     float64   `json:"final_score"`
	SubmittedAt    time.Time `json:"submitted_at"`
	Source         string    `json:"source"`          // 'SIAKAD' atau 'EXTERNAL'
	ExternalSchool string    `json:"external_school"` // Kosong jika SIAKAD
}
