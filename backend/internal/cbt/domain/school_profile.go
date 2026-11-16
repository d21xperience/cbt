// Package domain — entity SchoolProfile (extension profil sekolah, per tenant).
// BCR-2: source = Frontend mock schoolProfileHandlers.js.
package domain

import "errors"

var (
	ErrSchoolProfileNotFound     = errors.New("school_profile_not_found")
	ErrSchoolProfileInvalid      = errors.New("invalid_input")
	ErrSchoolProfileLogoInvalid  = errors.New("invalid_logo")
	ErrSchoolProfileLogoTooLarge = errors.New("logo_too_large")
)

// SchoolProfile — extension profil sekolah (tabel `school_profile`, migration 000019).
// Identity (nama_sekolah, npsn, jenjang) TIDAK di sini — dari platform.db.tenants.
// JSON tag MATCH frontend mock (schoolProfileData.js).
type SchoolProfile struct {
	NSS               string `json:"nss"`
	KodeSekolah       string `json:"kode_sekolah"`
	AlamatJalan       string `json:"alamat_jalan"`
	AlamatDesa        string `json:"alamat_desa"`
	AlamatKecamatan   string `json:"alamat_kecamatan"`
	AlamatKabupaten   string `json:"alamat_kabupaten"`
	AlamatProvinsi    string `json:"alamat_provinsi"`
	AlamatKodePos     string `json:"alamat_kode_pos"`
	Telp              string `json:"telp"`
	Email             string `json:"email"`
	Website           string `json:"website"`
	KepalaSekolahNama string `json:"kepala_sekolah_nama"`
	KepalaSekolahNIP  string `json:"kepala_sekolah_nip"`
	LogoURL           string `json:"logo_url"`
	UpdatedAt         string `json:"updated_at,omitempty"`
}
