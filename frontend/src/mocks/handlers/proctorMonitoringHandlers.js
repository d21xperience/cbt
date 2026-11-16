// src/mocks/handlers/proctorMonitoringHandlers.js
// Handler untuk proctor monitoring + unlock per-siswa per-sesi.

import { getAllLocksForSession, getLockState, updateLockState } from '../data/studentLockStore'

const DELAY = 300

// ── Helper: ambil participants sesi dari window.__sessionsStore
const getParticipantsForSession = (sessionId) => {
  if (typeof window === 'undefined') return []
  const stores = window.__sessionsStore || {}
  // Cari session di semua tenant (fallback)
  let session = null
  for (const list of Object.values(stores)) {
    if (Array.isArray(list)) {
      session = list.find((s) => s.id === sessionId)
      if (session) break
    }
  }
  if (!session) return []

  // Generate mock participants dari class_id
  const students = (window.__studentsStore || []).filter(
    (s) => s.kelas_id === session.class_id && s.status === 'AKTIF',
  )

  // Kalau tidak ada store, generate minimal 2 dummy berdasarkan kelas
  if (students.length === 0) {
    return [
      { student_id: 'std-demo-1', nama: 'Peserta Demo 1', nis: '0001' },
      { student_id: 'std-demo-2', nama: 'Peserta Demo 2', nis: '0002' },
    ]
  }

  return students.map((s) => ({
    student_id: s.id,
    nama: s.nama,
    nis: s.nis,
  }))
}

export const proctorMonitoringHandlers = (mock) => {
  // ── GET /proctor/sessions/:sessionId/students
  // Return list siswa + lock state
  mock.onGet(/\/proctor\/sessions\/([^/]+)\/students$/).reply((config) => {
    const sessionId = config.url.match(/\/proctor\/sessions\/([^/]+)\/students/)[1]

    const participants = getParticipantsForSession(sessionId)
    const locks = getAllLocksForSession(sessionId)

    const result = participants.map((p) => {
      const lock = locks[p.student_id] || {
        locked: false,
        lockLevel: 0,
        warnings: 0,
        violationCount: 0,
        lockCount: 0,
        lockedAt: null,
        unlockedBy: null,
        unlockedAt: null,
      }
      return {
        student_id: p.student_id,
        nama: p.nama,
        nis: p.nis,
        lock_state: lock.locked ? 'LOCKED' : 'UNLOCKED',
        lock_level: lock.lockLevel,
        warnings: lock.warnings,
        violation_count: lock.violationCount,
        lock_count: lock.lockCount,
        locked_at: lock.lockedAt,
        unlocked_by: lock.unlockedBy,
        unlocked_at: lock.unlockedAt,
      }
    })

    return [200, { status: 'ok', data: result, count: result.length }, { delay: DELAY }]
  })

  // ── POST /proctor/sessions/:sessionId/students/:studentId/unlock
  mock.onPost(/\/proctor\/sessions\/([^/]+)\/students\/([^/]+)\/unlock$/).reply((config) => {
    const m = config.url.match(/\/proctor\/sessions\/([^/]+)\/students\/([^/]+)\/unlock/)
    const [, sessionId, studentId] = m

    let body = {}
    try {
      body = JSON.parse(config.data || '{}')
    } catch {
      body = {}
    }
    const by = body.by === 'ADMIN' ? 'ADMIN' : 'PROCTOR'

    const cur = getLockState(sessionId, studentId)
    if (!cur.locked) {
      return [400, { ok: false, message: 'Siswa tidak dalam kondisi terkunci' }, { delay: DELAY }]
    }

    if (cur.lockLevel === 2 && by !== 'ADMIN') {
      return [
        403,
        { ok: false, message: 'Level 2 hanya dapat dibuka oleh ADMIN' },
        { delay: DELAY },
      ]
    }

    const resetWarnings = cur.lockLevel === 2 ? 0 : 1
    const unlockedLevel = cur.lockLevel
    const next = updateLockState(sessionId, studentId, {
      locked: false,
      lockLevel: 0,
      warnings: resetWarnings,
      unlockedBy: by,
      unlockedAt: new Date().toISOString(),
    })

    console.log(
      `🔓 [MOCK] Proctor unlock ${studentId}@${sessionId} by ${by} — ` +
        `level ${unlockedLevel}, sisa kesempatan: ${3 - resetWarnings}`,
    )

    return [
      200,
      {
        ok: true,
        unlocked_level: unlockedLevel,
        lock: next,
        message: `Siswa di-unlock oleh ${by}. Sisa kesempatan: ${3 - resetWarnings}`,
      },
      { delay: DELAY },
    ]
  })
}
