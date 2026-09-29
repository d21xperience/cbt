// src/mocks/handlers/examDashboardHandlers.js
// Dashboard peserta — build dari window.__sessionsStore (real-time).

const DELAY = 300

const calcEndTime = (startIso, durMin) => {
  if (!startIso) return null
  return new Date(new Date(startIso).getTime() + (Number(durMin) || 0) * 60000).toISOString()
}

// Build scheduled list dari sesi ACTIVE + SCHEDULED
const buildScheduled = () => {
  const sessions = (typeof window !== 'undefined' && window.__sessionsStore) || []
  const relevant = sessions.filter((s) => s.status === 'ACTIVE' || s.status === 'SCHEDULED')

  return relevant.map((s) => {
    const startIso =
      s.tanggal && s.jam_mulai ? new Date(`${s.tanggal}T${s.jam_mulai}:00`).toISOString() : null

    return {
      session_id: s.id,
      exam_id: s.id, // ← unique per sesi, match verify-token
      title: s.subject_nama || 'Ujian',
      session_type: s.jenis_ujian_kode || s.session_type || 'REGULER',
      session_status: s.status === 'ACTIVE' ? 'ACTIVE' : 'NOT_STARTED',
      start_time: startIso,
      end_time: calcEndTime(startIso, s.durasi_menit),
      blocked: false,
      blocked_reason: null,
      class_nama: s.class_nama,
      ruang_nama: s.ruang_nama,
    }
  })
}

export const examDashboardHandlers = (mock) => {
  // GET /exam/dashboard — 3-section
  mock.onGet('/exam/dashboard').reply(() => {
    const scheduled = buildScheduled()
    return [200, { data: { scheduled, makeup_available: [], completed: [] } }, { delay: DELAY }]
  })
}
