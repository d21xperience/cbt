package domain

import "errors"

var (
	ErrLessonNotFound  = errors.New("lesson_not_found")
	ErrLessonInvalid   = errors.New("invalid_lesson_input")
	ErrLessonDuplicate = errors.New("duplicate_lesson")
)

type Lesson struct {
	ID               string `json:"id"`
	SubjectID        string `json:"subject_id"`
	ClassID          string `json:"class_id"`
	TeacherID        string `json:"teacher_id"`
	AcademicPeriodID string `json:"academic_period_id,omitempty"`
	ExamID           string `json:"exam_id,omitempty"`
	TotalQuestions   int    `json:"total_questions"`
	AcademicYear     string `json:"academic_year,omitempty"`
	Semester         string `json:"semester,omitempty"`

	// Derived fields (hasil JOIN)
	SubjectKode  string `json:"subject_kode,omitempty"`
	SubjectNama  string `json:"subject_nama,omitempty"`
	ClassName    string `json:"class_nama,omitempty"`
	TeacherNama  string `json:"teacher_nama,omitempty"`
	IsExamAuthor bool   `json:"is_exam_author"`
}
