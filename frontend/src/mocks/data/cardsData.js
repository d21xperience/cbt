// src/mocks/data/cardsData.js
// Mock Kartu Ujian — Fase 2b-3a-1
// Static QR (opaque token) + signature QR + username/password (cadangan login manual)

import { mockStudents } from './studentsData'

const genToken = (seed, salt = 0) => {
  const chars = 'abcdef0123456789'
  let s = ''
  for (let i = 0; i < 32; i++) s += chars[(seed * 7 + i * 13 + salt * 31) % 16]
  return s
}

const genUsername = (nama, idx) =>
  nama.toLowerCase().replace(/\s+/g, '.') + String(1000 + idx).slice(-4)

const genPassword = (seed) => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[(seed * 13 + i * 7) % chars.length]
  return s
}

export const mockCards = mockStudents
  .filter((s) => s.status === 'AKTIF')
  .map((s, idx) => ({
    id: `card-${String(idx + 1).padStart(3, '0')}`,
    card_number: `CRD-2026-${String(idx + 1).padStart(4, '0')}`,
    student_id: s.id,
    student_name: s.nama,
    student_nis: s.nis,
    student_nisn: s.nisn,
    student_photo_url: s.photo_url || null,
    class_id: s.kelas_id,
    class_nama: s.kelas_nama,
    card_type: 'PERMANENT',
    status: 'ACTIVE',
    qr_token: genToken(idx + 1), // QR besar — login
    signature_qr_token: genToken(idx + 1, 7), // QR kecil — ttd kepala sekolah
    pin: null,
    username: genUsername(s.nama, idx + 1),
    password: genPassword(idx + 1),
    device_fingerprint: null,
    device_bound_at: null,
    expiry_date: null,
    reason: null,
    printed_at: null,
    printed_by: null,
    created_at: '2026-09-20T08:00:00Z',
    _seed: idx + 1,
  }))

export const makeCardNumber = (n) => `CRD-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`

export const makeQrToken = () => {
  const chars = 'abcdef0123456789'
  let s = ''
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * 16)]
  return s
}

export const makePin = () => String(Math.floor(Math.random() * 10000)).padStart(4, '0')

export const resetCardsMockData = () => {
  mockCards.forEach((c) => {
    c.status = 'ACTIVE'
    c.device_fingerprint = null
    c.device_bound_at = null
  })
}
