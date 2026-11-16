package domain

import "errors"

var (
	ErrAcademicPeriodInvalid  = errors.New("invalid_academic_period")
	ErrAcademicPeriodExist    = errors.New("academic_period_already_exists")
	ErrAcademicPeriodNotFound = errors.New("academic_period_not_found")
)

type AcademicPeriod struct {
	ID           string `json:"id"`
	AcademicYear string `json:"academic_year"`
	Semester     string `json:"semester"`
	IsActive     bool   `json:"is_active"`
	CreatedAt    string `json:"created_at,omitempty"`
}

type RolloverResult struct {
	FromPeriod     string `json:"from_period"`
	ToPeriod       string `json:"to_period"`
	ClassesCopied  int    `json:"classes_copied"`
	StudentsCopied int    `json:"students_copied"`
	LessonsCopied  int    `json:"lessons_copied"`
	GraduatesCount int    `json:"graduates_count"`
}
