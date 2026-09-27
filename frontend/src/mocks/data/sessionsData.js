// src/mocks/data/sessionsData.js
// Mock Sesi Ujian (runtime instance dari jadwal × detail).
// Auto-generate dari ExamSchedule via handler.

// ── Sesi demo (untuk showcase berbagai status) — tidak auto-generate
export const mockSessionSeeds = [
  {
    id: 'sesi-demo-001',
    schedule_id: 'demo-sched-001',
    class_id: 'cls-001',
    class_nama: '10 IPA 1',
    subject_id: 'sub-004',
    subject_kode: 'MTK-10',
    subject_nama: 'Matematika',
    tingkat: '10',
    tanggal: '2026-12-01',
    jam_mulai: '07:30',
    durasi_menit: 90,
    ruang_id: 'room-001',
    ruang_nama: 'R01',
    pengawas_ids: ['tch-001', 'tch-007'],
    pengawas_namas: ['Mira Surtiningsih', 'Budi Santoso'],
    jenis_ujian_id: 'etype-002',
    jenis_ujian_kode: 'UAS',
    token: 'DEMO01',
    status: 'SCHEDULED',
    actual_start: null,
    actual_end: null,
    paused_at: null,
    extended_minutes: 0,
    participant_count: 24,
    active_count: 0,
    completed_count: 0,
    is_demo: true,
    created_at: '2026-09-27T08:00:00Z',
  },
  {
    id: 'sesi-demo-002',
    schedule_id: 'demo-sched-002',
    class_id: 'cls-002',
    class_nama: '10 IPA 2',
    subject_id: 'sub-004',
    subject_kode: 'MTK-10',
    subject_nama: 'Matematika',
    tingkat: '10',
    tanggal: '2026-12-01',
    jam_mulai: '07:30',
    durasi_menit: 90,
    ruang_id: 'room-002',
    ruang_nama: 'R02',
    pengawas_ids: ['tch-002', 'tch-008'],
    pengawas_namas: ['Sri Murti', 'Dewi Lestari'],
    jenis_ujian_id: 'etype-002',
    jenis_ujian_kode: 'UAS',
    token: 'DEMO02',
    status: 'ACTIVE',
    actual_start: '2026-12-01T00:30:00Z',
    actual_end: null,
    paused_at: null,
    extended_minutes: 0,
    participant_count: 23,
    active_count: 17,
    completed_count: 5,
    is_demo: true,
    created_at: '2026-09-27T08:00:00Z',
  },
  {
    id: 'sesi-demo-003',
    schedule_id: 'demo-sched-003',
    class_id: 'cls-003',
    class_nama: '11 IPA 1',
    subject_id: 'sub-009',
    subject_kode: 'MTK-11',
    subject_nama: 'Matematika',
    tingkat: '11',
    tanggal: '2026-12-01',
    jam_mulai: '09:30',
    durasi_menit: 90,
    ruang_id: 'room-003',
    ruang_nama: 'R03',
    pengawas_ids: ['tch-003', 'tch-009'],
    pengawas_namas: ['Fia Sri Mulyati', 'Hadi Widodo'],
    jenis_ujian_id: 'etype-002',
    jenis_ujian_kode: 'UAS',
    token: 'DEMO03',
    status: 'PAUSED',
    actual_start: '2026-12-01T02:30:00Z',
    actual_end: null,
    paused_at: '2026-12-01T02:50:00Z',
    extended_minutes: 8,
    participant_count: 22,
    active_count: 0,
    completed_count: 12,
    is_demo: true,
    created_at: '2026-09-27T08:00:00Z',
  },
  {
    id: 'sesi-demo-004',
    schedule_id: 'demo-sched-004',
    class_id: 'cls-005',
    class_nama: '12 IPA 1',
    subject_id: 'sub-012',
    subject_kode: 'MTK-12',
    subject_nama: 'Matematika',
    tingkat: '12',
    tanggal: '2026-11-28',
    jam_mulai: '07:30',
    durasi_menit: 90,
    ruang_id: 'room-005',
    ruang_nama: 'R05',
    pengawas_ids: ['tch-004', 'tch-006'],
    pengawas_namas: ['Ika Prasetya Ningsih', 'Siti Aminah'],
    jenis_ujian_id: 'etype-002',
    jenis_ujian_kode: 'UAS',
    token: 'DEMO04',
    status: 'COMPLETED',
    actual_start: '2026-11-28T00:30:00Z',
    actual_end: '2026-11-28T02:05:00Z',
    paused_at: null,
    extended_minutes: 5,
    participant_count: 21,
    active_count: 0,
    completed_count: 21,
    is_demo: true,
    created_at: '2026-09-27T08:00:00Z',
  },
]

export const resetSessionsMockData = () => {
  // Reset dilakukan di handler (closure store)
}

// ── Token generator (6 char alfanumerik uppercase)
// Catatan: sesuaikan format kalau TokenDisplay existing pakai format lain.
export const genSessionToken = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // exclude I,O,0,1
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

// ── Compute status by time
export const computeSessionStatusByTime = (s) => {
  const now = Date.now()
  const start = new Date(`${s.tanggal}T${s.jam_mulai}:00`).getTime()
  const dur = (Number(s.durasi_menit) || 0) + (Number(s.extended_minutes) || 0)
  const end = start + dur * 60000
  if (now < start) return 'SCHEDULED'
  if (now <= end) return 'ACTIVE'
  return 'COMPLETED'
}
