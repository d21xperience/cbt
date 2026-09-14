package domain

// CodingCategory merepresentasikan 5 kategori koding yang Anda sebutkan
type CodingCategory string

const (
	CatLogikaAlgoritma  CodingCategory = "LOGIKA_ALGORITMA"  // Dasar Logika & Algoritma
	CatDasarPemrograman CodingCategory = "DASAR_PEMROGRAMAN" // Dasar Pemrograman & Logika
	CatPemrogramanWeb   CodingCategory = "PEMROGRAMAN_WEB"   // Pemrograman Web Dasar
	CatOtomasiJaringan  CodingCategory = "OTOMASI_JARINGAN"  // Otomasi Jaringan & OS
	CatKodingAI         CodingCategory = "KODING_AI"         // Koding & Kecerdasan Buatan
	CatKodingOtomotif   CodingCategory = "KODING_OTOMOTIF"   // Integrasi Koding & Otomotif
)

// CodingMode membedakan cara penilaian
type CodingMode string

const (
	CodingModeAnalysis CodingMode = "ANALYSIS" // PG: trace output, find bug, complete code
	CodingModeWriting  CodingMode = "WRITING"  // Essay: tulis kode utuh
)

// ProgrammingLanguage untuk syntax highlighting di Quasar
type ProgrammingLanguage string

const (
	LangPython     ProgrammingLanguage = "python"
	LangJavaScript ProgrammingLanguage = "javascript"
	LangHTML       ProgrammingLanguage = "html"
	LangCSS        ProgrammingLanguage = "css"
	LangBash       ProgrammingLanguage = "bash"
	LangCPP        ProgrammingLanguage = "cpp"
	LangArduino    ProgrammingLanguage = "arduino"
	LangPseudocode ProgrammingLanguage = "pseudocode"
)

// Mapping kategori ke bahasa default (bisa di-override per soal)
var CategoryDefaultLang = map[CodingCategory]ProgrammingLanguage{
	CatLogikaAlgoritma:  LangPseudocode,
	CatDasarPemrograman: LangPython,
	CatPemrogramanWeb:   LangHTML,
	CatOtomasiJaringan:  LangBash,
	CatKodingAI:         LangPython,
	CatKodingOtomotif:   LangArduino,
}
