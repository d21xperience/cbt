package domain

import "errors"

var (
	ErrExamScheduleInvalid = errors.New("invalid_schedule_input")
)

type ExamSchedule struct {
	ID               string `json:"id"`
	LessonID         string `json:"lesson_id"`
	JenisUjianID     string `json:"jenis_ujian_id"`
	Tanggal          string `json:"tanggal"`
	JamMulai         string `json:"jam_mulai"`
	DurasiMenit      int    `json:"durasi_menit"`
	Pengawas1ID      string `json:"pengawas1_id,omitempty"`
	Pengawas2ID      string `json:"pengawas2_id,omitempty"`
	RuangID          string `json:"ruang_id,omitempty"`
	Status           string `json:"status"`
	Tingkat          string `json:"tingkat"`
	AcademicPeriodID string `json:"academic_period_id,omitempty"`
	AcademicYear     string `json:"academic_year"`
	Semester         string `json:"semester"`

	// Derived fields (JOIN)
	SubjectKode    string `json:"subject_kode,omitempty"`
	JenisUjianKode string `json:"jenis_ujian_kode,omitempty"`
	SubjectNama    string `json:"subject_nama,omitempty"`
	ClassID        string `json:"class_id,omitempty"`
	ClassName      string `json:"class_nama,omitempty"`
	TeacherNama    string `json:"teacher_nama,omitempty"`
	RuangNama      string `json:"ruang_nama,omitempty"`
	Pengawas1Nama  string `json:"pengawas1_nama,omitempty"`
	Pengawas2Nama  string `json:"pengawas2_nama,omitempty"`
	CreatedAt      string `json:"created_at,omitempty"`
}
