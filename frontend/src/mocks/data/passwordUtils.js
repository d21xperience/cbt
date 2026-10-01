// src/mocks/data/passwordUtils.js
// Helper password untuk ujian peserta.
// Initial password: deterministic dari NIS → predictable untuk test.
// Reset password (F1c): random 6-digit, disimpan di store.

/**
 * Derive password awal dari NIS (deterministic).
 * Hasil selalu 6 digit angka (100000–999999).
 */
export const deriveExamPassword = (nis) => {
  const input = String(nis || '')
  if (!input) return '000000'
  let h = 7
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return String((Math.abs(h) % 900000) + 100000)
}

/**
 * Generate password random 6-digit (untuk reset — F1c).
 */
export const generateRandomPassword = () => {
  return String(Math.floor(100000 + Math.random() * 900000))
}
