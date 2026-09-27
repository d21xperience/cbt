// src/mocks/data/sessionActivitiesData.js
// Generator mock untuk peserta / pelanggaran / activity log per sesi.
// Deterministik berdasarkan session.id — supaya reload tidak berubah total.

import { mockStudents } from './studentsData'

// ── Simple hash untuk seed deterministik
const hash = (str) => {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

// ── LCG random (deterministik per seed)
const makeRng = (seed) => {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const VIOLATION_TYPES = [
  { type: 'TAB_SWITCH', label: 'Pindah tab browser' },
  { type: 'WINDOW_BLUR', label: 'Window kehilangan fokus' },
  { type: 'FULLSCREEN_EXIT', label: 'Keluar fullscreen' },
  { type: 'COPY_PASTE', label: 'Copy-paste terdeteksi' },
  { type: 'DEVTOOLS_ATTEMPT', label: 'Percobaan buka DevTools' },
]

// ── Generate peserta sesi (1 siswa = 1 row)
export const generateParticipants = (session) => {
  if (!session) return []
  const rng = makeRng(hash(session.id))
  const students = mockStudents.filter(
    (s) => s.kelas_id === session.class_id && s.status === 'AKTIF',
  )
  const total = students.length
  const completed = session.completed_count || 0
  const active = session.active_count || 0
  const remaining = total - completed - active

  return students.map((s, idx) => {
    let status
    if (idx < completed) status = 'SELESAI'
    else if (idx < completed + active) status = 'AKTIF'
    else if (idx < completed + active + Math.min(remaining, 2) && session.status === 'ACTIVE')
      status = 'TERBLOKIR'
    else status = 'BELUM_MULAI'

    const progress =
      status === 'SELESAI'
        ? 100
        : status === 'AKTIF'
          ? Math.round(20 + rng() * 70)
          : status === 'TERBLOKIR'
            ? Math.round(rng() * 30)
            : 0

    const startedAt =
      status === 'SELESAI' || status === 'AKTIF' || status === 'TERBLOKIR'
        ? new Date(Date.now() - Math.floor(rng() * 3600000)).toISOString()
        : null
    const submittedAt =
      status === 'SELESAI' ? new Date(Date.now() - Math.floor(rng() * 1800000)).toISOString() : null

    const violationsCount = status === 'TERBLOKIR' ? 2 + Math.floor(rng() * 3) : 0

    return {
      student_id: s.id,
      nis: s.nis,
      nisn: s.nisn,
      nama: s.nama,
      jenis_kelamin: s.jenis_kelamin,
      status,
      progress_percent: progress,
      started_at: startedAt,
      submitted_at: submittedAt,
      violations_count: violationsCount,
      last_seen: startedAt ? new Date(Date.now() - Math.floor(rng() * 300000)).toISOString() : null,
    }
  })
}

// ── Generate violations (list)
export const generateViolations = (session, participants) => {
  if (!session || !participants) return []
  const rng = makeRng(hash(session.id + '_viol'))
  const out = []
  participants.forEach((p) => {
    if (p.violations_count === 0) return
    for (let i = 0; i < p.violations_count; i++) {
      const v = VIOLATION_TYPES[Math.floor(rng() * VIOLATION_TYPES.length)]
      const ts = new Date(Date.now() - Math.floor(rng() * 3600000)).toISOString()
      out.push({
        id: `viol-${p.student_id}-${i}`,
        student_id: p.student_id,
        student_nama: p.nama,
        class_nama: session.class_nama,
        type: v.type,
        label: v.label,
        timestamp: ts,
        action: i === 0 ? 'WARN' : i === 1 ? 'WARN' : 'BLOCK',
        reason: `${v.label} terdeteksi`,
      })
    }
  })
  return out.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
}

// ── Generate activity log (timeline)
export const generateActivities = (session, participants) => {
  if (!session) return []
  const out = []

  // Session started
  if (session.actual_start) {
    out.push({
      id: 'act-start',
      timestamp: session.actual_start,
      type: 'SESSION_START',
      icon: 'play_circle',
      color: 'positive',
      description: `Sesi dimulai (${session.jam_mulai})`,
      actor: 'System',
    })
  }

  // Login per peserta aktif/selesai
  participants
    .filter((p) => p.status === 'SELESAI' || p.status === 'AKTIF' || p.status === 'TERBLOKIR')
    .forEach((p, idx) => {
      if (idx > 15) return // batasi untuk mock
      if (p.started_at) {
        out.push({
          id: `act-login-${p.student_id}`,
          timestamp: p.started_at,
          type: 'LOGIN',
          icon: 'login',
          color: 'primary',
          description: `${p.nama} mulai mengerjakan`,
          actor: p.nama,
        })
      }
    })

  // Submit per peserta selesai
  participants
    .filter((p) => p.status === 'SELESAI' && p.submitted_at)
    .forEach((p) => {
      out.push({
        id: `act-submit-${p.student_id}`,
        timestamp: p.submitted_at,
        type: 'SUBMIT',
        icon: 'check_circle',
        color: 'positive',
        description: `${p.nama} selesai mengerjakan`,
        actor: p.nama,
      })
    })

  // Pause
  if (session.paused_at) {
    out.push({
      id: 'act-pause',
      timestamp: session.paused_at,
      type: 'SESSION_PAUSE',
      icon: 'pause_circle',
      color: 'orange',
      description: 'Sesi ditunda',
      actor: 'Admin',
    })
  }

  // End
  if (session.actual_end) {
    out.push({
      id: 'act-end',
      timestamp: session.actual_end,
      type: 'SESSION_END',
      icon: 'stop_circle',
      color: 'grey-7',
      description: 'Sesi diakhiri',
      actor: 'Admin',
    })
  }

  return out.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
}
