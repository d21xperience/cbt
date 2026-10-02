// src/mocks/data/examSchedulesData.js
// Mock Jadwal Ujian (ExamSchedule) — multi-tenant grouped.

import { DEFAULT_TENANT, flattenTenants } from './tenantHelpers'

const enrich = (tenant, list) => list.map((s) => ({ ...s, tenant_slug: tenant }))

const RAW_BY_TENANT = {
  // ═══════════════════════════════════════════════════
  // SMK NEGERI KAWALI — 2 existing schedules
  // ═══════════════════════════════════════════════════
  smknkawali: [
    {
      id: 'esched-001',
      jenis_ujian_id: 'etype-002',
      jenis_ujian_kode: 'UAS',
      academic_year: '2025/2026',
      semester: 'GANJIL',
      tingkat: '10',
      tanggal: '2026-12-03',
      jam_mulai: '07:30',
      durasi_menit: 84,
      subject_id: 'sub-004',
      subject_kode: 'MTK-10',
      subject_nama: 'Matematika',
      kelompok: 'WAJIB',
      jurusan_id: null,
      status: 'DRAFT',
      created_at: '2026-09-27T08:00:00Z',
    },
    {
      id: 'esched-002',
      jenis_ujian_id: 'etype-002',
      jenis_ujian_kode: 'UAS',
      academic_year: '2025/2026',
      semester: 'GANJIL',
      tingkat: '10',
      tanggal: '2026-12-03',
      jam_mulai: '09:00',
      durasi_menit: 90,
      subject_id: 'sub-003',
      subject_kode: 'BIN-10',
      subject_nama: 'Bahasa Indonesia',
      kelompok: 'WAJIB',
      jurusan_id: null,
      status: 'DRAFT',
      created_at: '2026-09-27T08:00:00Z',
    },
  ],

  // ═══════════════════════════════════════════════════
  // SMK PASJA — 2 schedules (RPL, TKJ)
  // ═══════════════════════════════════════════════════
  smkpasja: [
    {
      id: 'esched-101',
      jenis_ujian_id: 'etype-002',
      jenis_ujian_kode: 'UAS',
      academic_year: '2025/2026',
      semester: 'GANJIL',
      tingkat: '10',
      tanggal: '2026-12-03',
      jam_mulai: '07:30',
      durasi_menit: 90,
      subject_id: 'sub-015',
      subject_kode: 'DDK-RPL-10',
      subject_nama: 'Dasar-Dasar Keahlian RPL',
      kelompok: 'KEJURUAN',
      jurusan_id: 'prog-rpl',
      status: 'DRAFT',
      created_at: '2026-09-27T08:00:00Z',
    },
    {
      id: 'esched-102',
      jenis_ujian_id: 'etype-002',
      jenis_ujian_kode: 'UAS',
      academic_year: '2025/2026',
      semester: 'GANJIL',
      tingkat: '10',
      tanggal: '2026-12-04',
      jam_mulai: '07:30',
      durasi_menit: 90,
      subject_id: 'sub-013',
      subject_kode: 'DDK-TKJ-10',
      subject_nama: 'Dasar-Dasar Keahlian TKJ',
      kelompok: 'KEJURUAN',
      jurusan_id: 'prog-tkj',
      status: 'DRAFT',
      created_at: '2026-09-27T08:00:00Z',
    },
  ],

  // ═══════════════════════════════════════════════════
  // MTs MA'ARIF JATIREJO — 1 schedule (Bahasa Arab)
  // ═══════════════════════════════════════════════════
  mtsmaarifjtr: [
    {
      id: 'esched-201',
      jenis_ujian_id: 'etype-002',
      jenis_ujian_kode: 'UAS',
      academic_year: '2025/2026',
      semester: 'GANJIL',
      tingkat: '7',
      tanggal: '2026-12-03',
      jam_mulai: '07:30',
      durasi_menit: 60,
      subject_id: 'sub-201',
      subject_kode: 'BAR-7',
      subject_nama: 'Bahasa Arab',
      kelompok: 'MULOK',
      jurusan_id: null,
      status: 'DRAFT',
      created_at: '2026-09-27T08:00:00Z',
    },
  ],

  // ═══════════════════════════════════════════════════
  // SMP NEGERI 1 JATINANGOR — 1 schedule (Matematika)
  // ═══════════════════════════════════════════════════
  smpn1jatinangor: [
    {
      id: 'esched-301',
      jenis_ujian_id: 'etype-002',
      jenis_ujian_kode: 'UAS',
      academic_year: '2025/2026',
      semester: 'GANJIL',
      tingkat: '7',
      tanggal: '2026-12-03',
      jam_mulai: '07:30',
      durasi_menit: 60,
      subject_id: 'sub-004',
      subject_kode: 'MTK-10',
      subject_nama: 'Matematika',
      kelompok: 'WAJIB',
      jurusan_id: null,
      status: 'DRAFT',
      created_at: '2026-09-27T08:00:00Z',
    },
  ],

  // ═══════════════════════════════════════════════════
  // SMA NEGERI 1 CIREBON — 1 schedule (Matematika)
  // ═══════════════════════════════════════════════════
  sman1cirebon: [
    {
      id: 'esched-401',
      jenis_ujian_id: 'etype-002',
      jenis_ujian_kode: 'UAS',
      academic_year: '2025/2026',
      semester: 'GANJIL',
      tingkat: '10',
      tanggal: '2026-12-03',
      jam_mulai: '07:30',
      durasi_menit: 90,
      subject_id: 'sub-004',
      subject_kode: 'MTK-10',
      subject_nama: 'Matematika',
      kelompok: 'WAJIB',
      jurusan_id: null,
      status: 'DRAFT',
      created_at: '2026-09-27T08:00:00Z',
    },
  ],
}

// ── Public: grouped
export const mockExamSchedulesByTenant = Object.fromEntries(
  Object.entries(RAW_BY_TENANT).map(([tenant, list]) => [tenant, enrich(tenant, list)]),
)

// ── Getter helpers
export const getSchedulesByTenant = (tenant) =>
  mockExamSchedulesByTenant[tenant] || mockExamSchedulesByTenant[DEFAULT_TENANT] || []

export const getAllSchedules = () => flattenTenants(mockExamSchedulesByTenant)

// ── Backward-compat: flat (DEPRECATED, hapus di F0.5d)
export const mockExamSchedules = getAllSchedules()

// ── Helpers (dipakai UI)
export const calcEndTime = (start, durationMin) => {
  if (!start || !durationMin) return '--:--'
  const [h, m] = String(start).split(':').map(Number)
  const total = h * 60 + m + Number(durationMin)
  const eh = Math.floor(total / 60) % 24
  const em = total % 60
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
}

export const dayNameFromDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { weekday: 'long' })
}

export const buildDetailsForRow = (row, classes) => {
  const matched = classes.filter((c) => {
    if (c.tingkat !== row.tingkat) return false
    if (c.status === 'NONAKTIF') return false
    if (!row.jurusan_id) return true
    return c.program_keahlian_id === row.jurusan_id
  })
  return matched.map((c) => ({
    class_id: c.id,
    class_nama: c.nama,
    ruang_id: c.ruang_id || null,
    ruang_nama: c.ruang_nama || null,
    pengawas_ids: [],
    pengawas_namas: [],
  }))
}

export const autoAssignPengawas = (details, teachers, countPerKelas = 2) => {
  if (!teachers || teachers.length === 0) return details
  let pointer = 0
  return details.map((d) => {
    const picks = []
    for (let i = 0; i < countPerKelas; i++) {
      picks.push(teachers[pointer % teachers.length])
      pointer++
    }
    return {
      ...d,
      pengawas_ids: picks.map((t) => t.id),
      pengawas_namas: picks.map((t) => t.nama),
    }
  })
}

export const resetExamSchedulesMockData = () => {
  // No-op — reset di handler
}
