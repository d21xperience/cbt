// src/mocks/handlers/examDashboardHandlers.js
// Dashboard peserta — build dari window.__sessionsStore (real-time, per tenant).

// src/mocks/handlers/examDashboardHandlers.js
import { resolveTenant } from '../data/tenantHelpers'
import { getSessionSeedsByTenant } from '../data/sessionsData'

const DELAY = 300

const calcEndTime = (startIso, durMin) => {
  if (!startIso) return null
  return new Date(new Date(startIso).getTime() + (Number(durMin) || 0) * 60000).toISOString()
}

// ── Baca sessions untuk tenant — fallback ke seed kalau store belum init
const getSessionsForTenant = (tenant) => {
  if (typeof window === 'undefined') return []
  const store = window.__sessionsStore || {}
  if (Array.isArray(store[tenant]) && store[tenant].length > 0) {
    return store[tenant]
  }
  // Fallback: pakai seed (dashboard tidak trigger auto-generate)
  return getSessionSeedsByTenant(tenant)
}

const buildScheduled = (tenant) => {
  const sessions = getSessionsForTenant(tenant)
  const relevant = sessions.filter((s) => s.status === 'ACTIVE' || s.status === 'SCHEDULED')

  const items = relevant.map((s) => {
    const startIso =
      s.tanggal && s.jam_mulai ? new Date(`${s.tanggal}T${s.jam_mulai}:00`).toISOString() : null

    return {
      session_id: s.id,
      exam_id: s.id,
      title: s.subject_nama || 'Ujian',
      subject_nama: s.subject_nama || 'Ujian',
      session_type: s.jenis_ujian_kode || s.session_type || 'REGULER',
      session_status: s.status === 'ACTIVE' ? 'ACTIVE' : 'NOT_STARTED',
      start_time: startIso,
      end_time: calcEndTime(startIso, s.durasi_menit),
      duration_minutes: Number(s.durasi_menit) || 0,
      tanggal: s.tanggal,
      jam_mulai: s.jam_mulai,
      blocked: false,
      blocked_reason: null,
      class_nama: s.class_nama,
      ruang_nama: s.ruang_nama,
      // Backward-compat dengan UI lama (yang pakai e.status, e.date)
      status: s.status === 'ACTIVE' ? 'ongoing' : 'upcoming',
      date: startIso,
      name: s.subject_nama || 'Ujian',
      subject: s.subject_nama || 'Ujian',
      duration: Number(s.durasi_menit) || 0,
    }
  })

  // Sort: start_time ASC (terdekat dulu)
  items.sort((a, b) => {
    if (!a.start_time) return 1
    if (!b.start_time) return -1
    return a.start_time.localeCompare(b.start_time)
  })

  return items
}

export const examDashboardHandlers = (mock) => {
  // GET /exam/dashboard — 3-section
  mock.onGet('/exam/dashboard').reply((config) => {
    const tenant = resolveTenant(config)
    const scheduled = buildScheduled(tenant)
    return [200, { data: { scheduled, makeup_available: [], completed: [] } }, { delay: DELAY }]
  })
}
