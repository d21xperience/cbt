// src/mocks/data/sessionsData.js
// Mock Sesi Ujian — multi-tenant grouped.
// Auto-generate dari ExamSchedule via handler.

import { DEFAULT_TENANT, flattenTenants } from './tenantHelpers'

const enrich = (tenant, list) => list.map((s) => ({ ...s, tenant_slug: tenant }))

// ── Demo seeds per tenant (untuk showcase berbagai status)
const RAW_BY_TENANT = {
  // ═══════════════════════════════════════════════════
  // SMK NEGERI KAWALI — 4 existing demo sessions
  // ═══════════════════════════════════════════════════
  smknkawali: [
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
      session_type: 'REGULER',
      valid_from: null,
      valid_until: null,
      remaining_seconds: 0,
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
      session_type: 'REGULER',
      valid_from: null,
      valid_until: null,
      remaining_seconds: 0,
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
      session_type: 'REGULER',
      valid_from: null,
      valid_until: null,
      remaining_seconds: 0,
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
      session_type: 'REGULER',
      valid_from: null,
      valid_until: null,
      remaining_seconds: 0,
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
  ],

  // ═══════════════════════════════════════════════════
  // SMK PASJA — 1 demo (ACTIVE)
  // ═══════════════════════════════════════════════════
  smkpasja: [
    {
      id: 'sesi-demo-pasja-001',
      schedule_id: 'demo-sched-pasja-001',
      class_id: 'cls-101',
      class_nama: 'X RPL 1',
      subject_id: 'sub-015',
      subject_kode: 'DDK-RPL-10',
      subject_nama: 'Dasar-Dasar Keahlian RPL',
      tingkat: '10',
      tanggal: '2026-12-01',
      jam_mulai: '07:30',
      durasi_menit: 90,
      ruang_id: 'room-101',
      ruang_nama: 'RPL-01',
      pengawas_ids: ['tch-101'],
      pengawas_namas: ['Ahmad Fauzi, S.Kom'],
      jenis_ujian_id: 'etype-002',
      jenis_ujian_kode: 'UAS',
      token: 'PSJA01',
      session_type: 'REGULER',
      valid_from: null,
      valid_until: null,
      remaining_seconds: 0,
      status: 'ACTIVE',
      actual_start: '2026-12-01T00:30:00Z',
      actual_end: null,
      paused_at: null,
      extended_minutes: 0,
      participant_count: 2,
      active_count: 2,
      completed_count: 0,
      is_demo: true,
      created_at: '2026-09-27T08:00:00Z',
    },
  ],

  // ═══════════════════════════════════════════════════
  // MTs MA'ARIF JATIREJO — 1 demo (SCHEDULED)
  // ═══════════════════════════════════════════════════
  mtsmaarifjtr: [
    {
      id: 'sesi-demo-mts-001',
      schedule_id: 'demo-sched-mts-001',
      class_id: 'cls-201',
      class_nama: '7A',
      subject_id: 'sub-201',
      subject_kode: 'BAR-7',
      subject_nama: 'Bahasa Arab',
      tingkat: '7',
      tanggal: '2026-12-01',
      jam_mulai: '07:30',
      durasi_menit: 60,
      ruang_id: 'room-201',
      ruang_nama: '7A',
      pengawas_ids: ['tch-201'],
      pengawas_namas: ['Ust. Ahmad Zaki, S.Pd.I'],
      jenis_ujian_id: 'etype-002',
      jenis_ujian_kode: 'UAS',
      token: 'MTS001',
      session_type: 'REGULER',
      valid_from: null,
      valid_until: null,
      remaining_seconds: 0,
      status: 'SCHEDULED',
      actual_start: null,
      actual_end: null,
      paused_at: null,
      extended_minutes: 0,
      participant_count: 2,
      active_count: 0,
      completed_count: 0,
      is_demo: true,
      created_at: '2026-09-27T08:00:00Z',
    },
  ],

  // ═══════════════════════════════════════════════════
  // SMP NEGERI 1 JATINANGOR — 1 demo (SCHEDULED)
  // ═══════════════════════════════════════════════════
  smpn1jatinangor: [
    {
      id: 'sesi-demo-smp-001',
      schedule_id: 'demo-sched-smp-001',
      class_id: 'cls-301',
      class_nama: '7A',
      subject_id: 'sub-004',
      subject_kode: 'MTK-10',
      subject_nama: 'Matematika',
      tingkat: '7',
      tanggal: '2026-12-01',
      jam_mulai: '07:30',
      durasi_menit: 60,
      ruang_id: 'room-301',
      ruang_nama: '7A',
      pengawas_ids: ['tch-301'],
      pengawas_namas: ['Dedi Kurniawan, S.Pd'],
      jenis_ujian_id: 'etype-002',
      jenis_ujian_kode: 'UAS',
      token: 'SMP001',
      session_type: 'REGULER',
      valid_from: null,
      valid_until: null,
      remaining_seconds: 0,
      status: 'SCHEDULED',
      actual_start: null,
      actual_end: null,
      paused_at: null,
      extended_minutes: 0,
      participant_count: 2,
      active_count: 0,
      completed_count: 0,
      is_demo: true,
      created_at: '2026-09-27T08:00:00Z',
    },
  ],

  // ═══════════════════════════════════════════════════
  // SMA NEGERI 1 CIREBON — 1 demo (SCHEDULED)
  // ═══════════════════════════════════════════════════
  sman1cirebon: [
    {
      id: 'sesi-demo-sma-001',
      schedule_id: 'demo-sched-sma-001',
      class_id: 'cls-401',
      class_nama: 'X IPA 1',
      subject_id: 'sub-004',
      subject_kode: 'MTK-10',
      subject_nama: 'Matematika',
      tingkat: '10',
      tanggal: '2026-12-01',
      jam_mulai: '07:30',
      durasi_menit: 90,
      ruang_id: 'room-401',
      ruang_nama: 'X-IPA-1',
      pengawas_ids: ['tch-401'],
      pengawas_namas: ['Dra. Siti Fatimah'],
      jenis_ujian_id: 'etype-002',
      jenis_ujian_kode: 'UAS',
      token: 'SMA001',
      session_type: 'REGULER',
      valid_from: null,
      valid_until: null,
      remaining_seconds: 0,
      status: 'SCHEDULED',
      actual_start: null,
      actual_end: null,
      paused_at: null,
      extended_minutes: 0,
      participant_count: 2,
      active_count: 0,
      completed_count: 0,
      is_demo: true,
      created_at: '2026-09-27T08:00:00Z',
    },
  ],
}

// ── Public: grouped
export const mockSessionSeedsByTenant = Object.fromEntries(
  Object.entries(RAW_BY_TENANT).map(([tenant, list]) => [tenant, enrich(tenant, list)]),
)

// ── Getter
export const getSessionSeedsByTenant = (tenant) =>
  mockSessionSeedsByTenant[tenant] || mockSessionSeedsByTenant[DEFAULT_TENANT] || []

export const getAllSessionSeeds = () => flattenTenants(mockSessionSeedsByTenant)

// ── Backward-compat: flat (DEPRECATED)
export const mockSessionSeeds = getAllSessionSeeds()

export const resetSessionsMockData = () => {
  // Reset dilakukan di handler (closure store)
}

// ── Token generator (6 char alfanumerik uppercase)
export const genSessionToken = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
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

// ── Token TTL default
export const DEFAULT_TOKEN_TTL_SECONDS = 300

export const setTokenTtl = (session, ttlSeconds = DEFAULT_TOKEN_TTL_SECONDS) => {
  const now = Date.now()
  session.valid_from = new Date(now).toISOString()
  session.valid_until = new Date(now + ttlSeconds * 1000).toISOString()
  session.remaining_seconds = ttlSeconds
  return session
}

export const computeRemainingSeconds = (session) => {
  if (!session?.valid_until) return 0
  const diff = new Date(session.valid_until).getTime() - Date.now()
  return Math.max(0, Math.floor(diff / 1000))
}

export const computeStartTime = (s) => {
  if (!s?.tanggal || !s?.jam_mulai) return null
  return new Date(`${s.tanggal}T${s.jam_mulai}:00`).toISOString()
}

export const computeEndTime = (s) => {
  const start = computeStartTime(s)
  if (!start) return null
  const dur = (Number(s.durasi_menit) || 0) + (Number(s.extended_minutes) || 0)
  return new Date(new Date(start).getTime() + dur * 60000).toISOString()
}

export const enrichForExisting = (s) => {
  if (!s) return null
  return {
    ...s,
    session_id: s.id,
    exam_title: `${s.subject_nama || '-'} — ${s.class_nama || '-'}`,
    start_time: computeStartTime(s),
    end_time: computeEndTime(s),
    student_count: s.participant_count || 0,
    status: s.status === 'COMPLETED' ? 'CLOSED' : s.status === 'PAUSED' ? 'ACTIVE' : s.status,
  }
}
