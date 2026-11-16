package domain

import "errors"

var (
	ErrClassNotFound = errors.New("class_not_found")
	ErrClassInvalid  = errors.New("invalid_class_input")
)

type Class struct {
	ID                string `json:"id"`
	Nama              string `json:"nama"`
	Tingkat           int    `json:"tingkat"`
	Kurikulum         string `json:"kurikulum,omitempty"`
	JenisRombel       string `json:"jenis_rombel,omitempty"`
	ProgramKeahlianID string `json:"program_keahlian_id,omitempty"`
	WaliKelasID       string `json:"wali_kelas_id,omitempty"`
	WaliKelasNama     string `json:"wali_kelas_nama,omitempty"`
	RuangID           string `json:"ruang_id,omitempty"`
	RuangNama         string `json:"ruang_nama,omitempty"`
	JumlahSiswa       int    `json:"jumlah_siswa"`
	AcademicPeriodID  string `json:"academic_period_id,omitempty"`
	AcademicYear      string `json:"academic_year,omitempty"`
	Semester          string `json:"semester,omitempty"`
	CreatedAt         string `json:"created_at,omitempty"`
	UpdatedAt         string `json:"updated_at,omitempty"`
}
