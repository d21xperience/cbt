// src/domain/school/jenjang.js
// Pure domain: mapping jenjang → opsi kelas + flag jurusan.
// TIDAK bergantung pada Vue/Pinia/Axios/browser API.
//
// VER-008 (2026-09-20): jenjang valid = SMP, MTs, SMA, MA, SMK, MAK
// Duration valid: 1-6 tahun.
// Default backend: jenjang="SMA", program_duration_years=3.

export const JENJANG = Object.freeze({
  SD: 'SD',
  SMP: 'SMP',
  MTs: 'MTs',
  SMA: 'SMA',
  SMK: 'SMK',
  MA: 'MA',
  MAK: 'MAK',
})

/**
 * Normalisasi input jenjang → value enum canonical.
 * Backend kirim "SMK" / "smk" / "Smk" → semua jadi "SMK".
 * MTs/MA/MAK: case dipertahankan (huruf besar-kecil signifikan).
 */
export const normalizeJenjang = (raw) => {
  if (!raw) return null
  const s = String(raw).trim()
  const upper = s.toUpperCase()
  if (upper === 'MTS') return JENJANG.MTs
  if (upper === 'MAK') return JENJANG.MAK
  if (upper === 'MA') return JENJANG.MA
  if (upper === 'SMP') return JENJANG.SMP
  if (upper === 'SMA') return JENJANG.SMA
  if (upper === 'SMK') return JENJANG.SMK
  if (upper === 'SD') return JENJANG.SD
  return s
}

/**
 * Apakah jenjang ini punya jurusan?
 * Per domain: SMK dan MAK (Madrasah Aliyah Kejuruan) punya jurusan.
 */
export const hasMajor = (jenjang) => {
  const j = normalizeJenjang(jenjang)
  return j === JENJANG.SMK || j === JENJANG.MAK
}

/**
 * Range kelas untuk jenjang tertentu.
 * Aturan (VER-008):
 *   SD       → 1..6
 *   SMP/MTs  → 7..9
 *   SMA/MA   → 10..12
 *   SMK/MAK  → 10..(10 + duration - 1) — duration default 3, bisa 1-6
 *
 * @param {string} jenjang
 * @param {number} [duration=3]
 * @returns {Array<{label:string, value:string}>}
 */
export const getGradeOptionsForJenjang = (jenjang, duration = 3) => {
  const j = normalizeJenjang(jenjang)

  const buildRange = (start, end) => {
    const out = []
    for (let i = start; i <= end; i++) {
      out.push({ label: `Kelas ${i}`, value: String(i) })
    }
    return out
  }

  switch (j) {
    case JENJANG.SD:
      return buildRange(1, 6)
    case JENJANG.SMP:
    case JENJANG.MTs:
      return buildRange(7, 9)
    case JENJANG.SMA:
    case JENJANG.MA:
      return buildRange(10, 12)
    case JENJANG.SMK:
    case JENJANG.MAK: {
      const years = Number.isFinite(duration) && duration >= 1 && duration <= 6 ? duration : 3
      return buildRange(10, 10 + years - 1)
    }
    default:
      return []
  }
}

/**
 * Label human-readable untuk jenjang.
 */
export const getJenjangLabel = (jenjang) => {
  const j = normalizeJenjang(jenjang)
  if (!j) return '-'
  const labels = {
    SD: 'SD (Sekolah Dasar)',
    SMP: 'SMP (Sekolah Menengah Pertama)',
    MTs: 'MTs (Madrasah Tsanawiyah)',
    SMA: 'SMA (Sekolah Menengah Atas)',
    SMK: 'SMK (Sekolah Menengah Kejuruan)',
    MA: 'MA (Madrasah Aliyah)',
    MAK: 'MAK (Madrasah Aliyah Kejuruan)',
  }
  return labels[j] || j
}
