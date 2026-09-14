// internal/cbt/domain/grading.go
package domain

// EssayGradingPayload adalah data yang dikirim ke Redis queue untuk dinilai oleh worker
type EssayGradingPayload struct {
	ParticipantID   string  `json:"participant_id"`
	ExamID          string  `json:"exam_id"`
	QuestionID      string  `json:"question_id"`
	QuestionType    string  `json:"question_type"`
	AnswerText      string  `json:"answer_text"`
	Rubric          string  `json:"rubric"`
	MaxScore        float64 `json:"max_score"`
	CodingCategory  string  `json:"coding_category,omitempty"`
	ProgrammingLang string  `json:"programming_lang,omitempty"`
}
