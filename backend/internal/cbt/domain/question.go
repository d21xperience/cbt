package domain

type QuestionType string

const (
	TypePG       QuestionType = "PG"
	TypeEssay    QuestionType = "ESSAY"
	TypeMatching QuestionType = "MATCHING"
	TypeHotspot  QuestionType = "HOTSPOT"
	TypeAudio    QuestionType = "AUDIO"
	TypeCoding   QuestionType = "CODING"
)

type Question struct {
	ID            string       `json:"id"`
	ExamID        string       `json:"exam_id"`
	QuestionType  QuestionType `json:"question_type"` // 🔥 BARU
	QuestionText  string       `json:"question_text"` // Bisa berisi HTML, LaTeX, <img>, <audio>
	MediaURL      string       `json:"media_url"`
	Options       string       `json:"options"`          // JSON string (format berbeda per tipe)
	CorrectOption string       `json:"-"`                // JSON string untuk tipe kompleks
	Score         float64      `json:"score"`            // 🔥 BARU: Bobot nilai
	Rubric        string       `json:"rubric,omitempty"` // 🔥 BARU: Rubrik essay

	// 🔥 FIELD BARU untuk soal koding
	CodingCategory  CodingCategory      `json:"coding_category,omitempty"`
	CodingMode      CodingMode          `json:"coding_mode,omitempty"`
	ProgrammingLang ProgrammingLanguage `json:"programming_lang,omitempty"`
}
