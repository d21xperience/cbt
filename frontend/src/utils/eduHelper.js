/**
 * 1. Mengubah angka menjadi angka Romawi (Untuk Tingkat Kelas / Semester)
 * Contoh: 10 -> "X", 12 -> "XII"
 */
export function toRoman(num) {
  const n = Number(num)
  if (!n || n <= 0 || n >= 4000) return ''

  const romanMap = [
    { value: 1000, symbol: 'M' },
    { value: 900, symbol: 'CM' },
    { value: 500, symbol: 'D' },
    { value: 400, symbol: 'CD' },
    { value: 100, symbol: 'C' },
    { value: 90, symbol: 'XC' },
    { value: 50, symbol: 'L' },
    { value: 40, symbol: 'XL' },
    { value: 10, symbol: 'X' },
    { value: 9, symbol: 'IX' },
    { value: 5, symbol: 'V' },
    { value: 4, symbol: 'IV' },
    { value: 1, symbol: 'I' },
  ]

  let result = ''
  let temp = n
  for (const item of romanMap) {
    while (temp >= item.value) {
      result += item.symbol
      temp -= item.value
    }
  }
  return result
}

/**
 * 2. Format Title Case (Huruf besar di awal kata, mendukung gelar/singkatan umum)
 * Contoh: "bahasa indonesia" -> "Bahasa Indonesia"
 */
export function toTitleCase(str) {
  if (!str) return ''
  return str.replace(/\b\w/g, (char) => char.toUpperCase())
}

/**
 * 3. Format Tahun Ajaran Otomatis
 * Contoh: 2026 -> "2026/2027"
 */
export function formatTahunAjaran(tahunAwal) {
  const year = Number(tahunAwal)
  if (!year || isNaN(year)) return ''
  return `${year}/${year + 1}`
}

/**
 * 4. Konversi Nomor Semester ke Label Ganjil/Genap
 * Contoh: 1 -> "Ganjil", 2 -> "Genap"
 */
export function formatSemester(semester) {
  const sem = Number(semester)
  if (sem === 1) return 'Ganjil'
  if (sem === 2) return 'Genap'
  return '-'
}

/**
 * 5. Konversi Nilai Angka ke Predikat Huruf (Standar Rapor/KKM)
 * Contoh: 88 -> "B" (Bisa disesuaikan batas KKM-nya)
 */
export function getPredikatNilai(nilai, kkm = 75) {
  const score = Number(nilai)
  if (isNaN(score)) return '-'
  if (score < kkm) return 'D' // Perlu Bimbingan

  // Hitung interval predikat berdasarkan KKM
  const interval = (100 - kkm) / 3
  if (score >= 100 - interval) return 'A' // Sangat Baik
  if (score >= 100 - interval * 2) return 'B' // Baik
  return 'C' // Cukup
}

/**
 * 6. Cek Status Ketuntasan Nilai (KKM)
 * Contoh: cekTuntas(78, 75) -> true
 */
export function isTuntas(nilai, kkm = 75) {
  return Number(nilai) >= Number(kkm)
}

/**
 * 7. Format Tanggal Standar Indonesia (Untuk Tanda Tangan Rapor / Surat)
 * Contoh: "2026-11-23" -> "23 November 2026"
 */
export function formatTanggalIndo(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * 8. Format NISN / NIP dengan Spasi agar Mudah Dibaca
 * Contoh NIP 18 digit: "198504122010011005" -> "19850412 201001 1 005"
 */
export function formatNIP(nip) {
  if (!nip) return '-'
  const clean = String(nip).replace(/\D/g, '')
  if (clean.length !== 18) return nip
  return `${clean.slice(0, 8)} ${clean.slice(8, 14)} ${clean.slice(14, 15)} ${clean.slice(15)}`
}

/**
 * 9. Generate Inisial Nama (Untuk Avatar Siswa/Guru jika tidak ada foto)
 * Contoh: "Ahmad Fauzi" -> "AF"
 */
export function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
