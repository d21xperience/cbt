// src/mocks/handlers/examHandlers.js
// Handler /exam/* (singular, dipakai ActiveExamService) + /exams/* (plural, legacy)
import { getLockState, updateLockState } from '../data/studentLockStore'
import {
  mockExamStart,
  mockAnswerSave,
  mockHeartbeat,
  mockTelemetry,
  mockSubmit,
  mockHistory,
  mockExams,
} from '../data/examdata'
import { incrementWarning, resetWarning } from '../data/stateStore'

const DELAY = 300

// ── Helper: parse JWT-A (Authorization) → student_id
// Format mock: `mock-participant-token-<studentId>-<timestamp>`
const parseStudentIdFromAuth = (config) => {
  const auth = config.headers?.Authorization || config.headers?.authorization || ''
  const m = String(auth).match(/mock-participant-token-([a-zA-Z0-9_-]+)-\d+/)
  return m ? m[1] : null
}

// ── Helper: parse JWT-B (X-Exam-Token) → { examId, sessionId }
// Format mock: `mock_jwtB_<examId>_<sessionId>_<ts>_<rand>`
const parseJwtB = (config) => {
  const tok = config.headers?.['X-Exam-Token'] || config.headers?.['x-exam-token'] || ''
  const m = String(tok).match(/mock_jwtB_([^_]+)_([^_]+)_/)
  return m ? { examId: m[1], sessionId: m[2] } : { examId: null, sessionId: null }
}

// ── Rate limit verify-token

const MAX_VERIFY_ATTEMPTS = 5
const VERIFY_WINDOW_MS = 60 * 1000
const verifyAttempts = new Map()

const isRateLimited = (examId) => {
  const rec = verifyAttempts.get(examId)
  if (!rec) return false
  if (Date.now() - rec.firstAt > VERIFY_WINDOW_MS) {
    verifyAttempts.delete(examId)
    return false
  }
  return rec.count >= MAX_VERIFY_ATTEMPTS
}

const recordAttempt = (examId) => {
  const now = Date.now()
  const rec = verifyAttempts.get(examId)
  if (!rec || now - rec.firstAt > VERIFY_WINDOW_MS) {
    verifyAttempts.set(examId, { count: 1, firstAt: now })
  } else {
    rec.count += 1
  }
}

const clearAttempts = (examId) => verifyAttempts.delete(examId)

const genMockJwtB = (sessionId, examId) =>
  `mock_jwtB_${examId}_${sessionId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

// ── Timer state global (mock)
const timerState = { status: 'NOT_STARTED', remainingSeconds: 0, startedAt: null }

export const examHandlers = (mock) => {
  // ═══════════════════════════════════════════════════
  // SINGULAR /exam/* — untuk ActiveExamService
  // ═══════════════════════════════════════════════════

  mock.onPost('/exam/start').reply(() => {
    resetWarning()
    timerState.status = 'ACTIVE'
    timerState.remainingSeconds = mockExamStart.duration_seconds || 1800
    timerState.startedAt = Date.now()
    return [200, mockExamStart, { delay: DELAY }]
  })

  mock.onGet('/exam/timer').reply(() => {
    if (timerState.status === 'ACTIVE' && timerState.startedAt) {
      const elapsed = Math.floor((Date.now() - timerState.startedAt) / 1000)
      const remaining = Math.max(0, timerState.remainingSeconds - elapsed)
      if (remaining === 0) timerState.status = 'EXPIRED'
      return [200, { status: timerState.status, remaining_seconds: remaining }, { delay: DELAY }]
    }
    return [
      200,
      { status: timerState.status, remaining_seconds: timerState.remainingSeconds },
      { delay: DELAY },
    ]
  })

  mock.onPost('/exam/answer').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    console.log(`💾 [MOCK] Answer: ${body.question_id} = ${body.answer}`)
    return [200, mockAnswerSave, { delay: DELAY }]
  })

  mock.onPost('/exam/answers/batch').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    console.log(`💾 [MOCK] Batch: ${body.answers?.length || 0} items`)
    return [200, { status: 'saved', count: body.answers?.length || 0 }, { delay: DELAY }]
  })

  mock.onPost('/exam/heartbeat').reply(() => [200, mockHeartbeat, { delay: DELAY }])

  // ── POST /exam/telemetry — PER-SISWA
  mock.onPost('/exam/telemetry').reply((config) => {
    let body = {}
    try {
      body = JSON.parse(config.data || '{}')
    } catch {
      body = {}
    }
    const eventType = body.event_type
    const reason = body.reason || mockTelemetry(eventType)?.reason || 'Pelanggaran terdeteksi'

    const studentId = parseStudentIdFromAuth(config)
    const { sessionId } = parseJwtB(config)

    if (!studentId || !sessionId) {
      return [
        400,
        { status: 'error', error: 'missing_identity', message: 'Auth/session tidak valid' },
        { delay: DELAY },
      ]
    }

    const cur = getLockState(sessionId, studentId)
    const nextWarnings = cur.warnings + 1
    const nextViolationCount = cur.violationCount + 1

    // Threshold: 3x → LOCK
    if (nextWarnings >= 3 && !cur.locked) {
      const nextLockCount = cur.lockCount + 1
      const nextLockLevel = Math.min(nextLockCount, 2)
      updateLockState(sessionId, studentId, {
        locked: true,
        lockLevel: nextLockLevel,
        warnings: 0,
        violationCount: nextViolationCount,
        lockCount: nextLockCount,
        lockedAt: new Date().toISOString(),
      })

      console.warn(
        `🔒 [MOCK] Student ${studentId}@${sessionId} → LOCK Level ${nextLockLevel} (total: ${nextViolationCount})`,
      )

      return [
        200,
        {
          status: 'processed',
          action: 'LOCK',
          lockLevel: nextLockLevel,
          warnings: 0,
          violationCount: nextViolationCount,
          reason:
            nextLockLevel === 2
              ? 'Pelanggaran berulang. Hubungi Admin untuk membuka.'
              : 'Batas pelanggaran tercapai. Hubungi pengawas.',
        },
        { delay: DELAY },
      ]
    }

    updateLockState(sessionId, studentId, {
      warnings: nextWarnings,
      violationCount: nextViolationCount,
    })

    console.log(
      `⚠️ [MOCK] Student ${studentId}@${sessionId} violation ${nextWarnings}/3: ${eventType}`,
    )
    return [
      200,
      {
        status: 'processed',
        action: 'WARN',
        warnings: nextWarnings,
        violationCount: nextViolationCount,
        reason,
      },
      { delay: DELAY },
    ]
  })

  // ── GET /exam/lock-status — polling unlock
  mock.onGet('/exam/lock-status').reply((config) => {
    const studentId = parseStudentIdFromAuth(config)
    const { sessionId } = parseJwtB(config)

    if (!studentId || !sessionId) {
      return [400, { error: 'missing_identity' }, { delay: DELAY }]
    }

    const s = getLockState(sessionId, studentId)
    return [
      200,
      {
        locked: s.locked,
        lockLevel: s.lockLevel,
        warnings: s.warnings,
        violationCount: s.violationCount,
        lockCount: s.lockCount,
      },
      { delay: DELAY },
    ]
  })

  // ── POST /exam/unlock — manual (demo via console)
  mock.onPost('/exam/unlock').reply((config) => {
    let body = {}
    try {
      body = JSON.parse(config.data || '{}')
    } catch {
      body = {}
    }
    const by = body.by === 'ADMIN' ? 'ADMIN' : 'PROCTOR'
    const studentId = parseStudentIdFromAuth(config)
    const { sessionId } = parseJwtB(config)

    if (!studentId || !sessionId) {
      return [400, { error: 'missing_identity' }, { delay: DELAY }]
    }

    const cur = getLockState(sessionId, studentId)
    if (!cur.locked) {
      return [200, { ok: false, message: 'Sesi tidak terkunci' }, { delay: DELAY }]
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
    updateLockState(sessionId, studentId, {
      locked: false,
      lockLevel: 0,
      warnings: resetWarnings,
      unlockedBy: by,
      unlockedAt: new Date().toISOString(),
    })

    return [
      200,
      {
        ok: true,
        unlockedLevel,
        warnings: resetWarnings,
        lockLevel: 0,
        message: `Siswa di-unlock oleh ${by}. Sisa kesempatan: ${3 - resetWarnings}`,
      },
      { delay: DELAY },
    ]
  })

  mock.onPost('/exam/submit').reply(() => {
    timerState.status = 'COMPLETED'
    return [200, mockSubmit, { delay: DELAY }]
  })

  mock.onGet('/exam/active').reply((config) => {
    const tenant = config.headers['X-Tenant-Slug'] || 'default'
    const pid = config.params?.participant_id
    const filtered = mockExams.filter((e) => e.tenant === tenant && e.participantId === pid)
    return [200, { data: filtered }, { delay: DELAY }]
  })

  mock.onGet('/exam/history').reply(() => [200, { data: mockHistory }, { delay: DELAY }])

  // ── POST /exam/{id}/verify-token — Exam Gate Token
  mock.onPost(/\/exam\/([^/]+)\/verify-token$/).reply((config) => {
    const examId = config.url.match(/\/exam\/([^/]+)\/verify-token/)[1]
    let body = {}
    try {
      body = JSON.parse(config.data || '{}')
    } catch {
      return [400, { valid: false, error: 'invalid_json' }, { delay: DELAY }]
    }

    const inputToken = String(body.token || '').trim()
    if (!inputToken || inputToken.length !== 6) {
      return [400, { valid: false, error: 'Token harus 6 karakter' }, { delay: DELAY }]
    }
    if (isRateLimited(examId)) {
      return [
        429,
        {
          valid: false,
          error: 'rate_limited',
          message: 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.',
        },
        { delay: DELAY },
      ]
    }

    const sessions = (typeof window !== 'undefined' && window.__sessionsStore) || []
    const match = sessions.find((s) => s.token === inputToken && s.status === 'ACTIVE')

    if (!match) {
      recordAttempt(examId)
      return [
        401,
        {
          valid: false,
          error: 'invalid_token',
          message: 'Token tidak valid atau sesi belum aktif.',
        },
        { delay: DELAY },
      ]
    }

    if (match.valid_until && new Date(match.valid_until).getTime() <= Date.now()) {
      recordAttempt(examId)
      return [
        401,
        {
          valid: false,
          error: 'token_expired',
          message: 'Token kadaluarsa. Minta proktor rotate ulang.',
        },
        { delay: DELAY },
      ]
    }

    clearAttempts(examId)

    // Auto-aktifkan timer (gate opened → timer starts)
    timerState.status = 'ACTIVE'
    timerState.remainingSeconds = 3600
    timerState.startedAt = Date.now()

    const jwtB = genMockJwtB(match.id, examId)
    return [
      200,
      {
        valid: true,
        token: jwtB,
        session_id: match.id,
        exam_id: examId,
        subject_nama: match.subject_nama,
        class_nama: match.class_nama,
        expires_in: 3600,
      },
      { delay: DELAY },
    ]
  })

  // ═══════════════════════════════════════════════════
  // PLURAL /exams/* — legacy, backward-compat
  // ═══════════════════════════════════════════════════
  mock.onPost('/exams/start').reply(() => {
    resetWarning()
    return [200, mockExamStart]
  })
  mock.onPost('/exams/answer').reply(() => [200, mockAnswerSave])
  mock.onPost('/exams/heartbeat').reply(() => [200, mockHeartbeat])
  mock.onPost('/exams/telemetry').reply((config) => {
    const body = JSON.parse(config.data)
    const warning = incrementWarning()
    const response = mockTelemetry(body.event_type)
    if (warning >= 5) {
      response.action = 'FORCE_SUBMIT'
      response.reason = 'Terlalu banyak pelanggaran!'
    }
    return [200, response]
  })
  mock.onPost('/exams/submit').reply(() => [200, mockSubmit])
  mock.onGet('/exams/active').reply((config) => {
    const tenant = config.headers['X-Tenant-Slug'] || 'default'
    const pid = config.params?.participant_id
    const filtered = mockExams.filter((e) => e.tenant === tenant && e.participantId === pid)
    return [200, filtered, { delay: DELAY }]
  })
  mock.onGet('/exams/history').reply(() => [200, mockHistory])
}

// ── Demo helper (expose ke window untuk console)
if (typeof window !== 'undefined') {
  // Legacy compat: __examLockState dihapus, diganti __studentLockStore
  // window.__studentLockStore di-expose di studentLockStore.js
  window.__unlockExam = (by = 'PROCTOR', sessionId, studentId) => {
    if (!sessionId || !studentId) {
      console.warn('__unlockExam: butuh sessionId + studentId')
      return
    }
    const cur = getLockState(sessionId, studentId)
    if (!cur.locked) {
      console.warn('__unlockExam: siswa tidak locked')
      return
    }
    const resetWarnings = cur.lockLevel === 2 ? 0 : 1
    updateLockState(sessionId, studentId, {
      locked: false,
      lockLevel: 0,
      warnings: resetWarnings,
      unlockedBy: by,
      unlockedAt: new Date().toISOString(),
    })
    console.log(`🔓 [DEMO] Unlock ${studentId}@${sessionId} by ${by}`)
  }
  window.__resetExamLock = () => {
    if (window.__resetStudentLocks) window.__resetStudentLocks()
    console.log('🔄 [DEMO] Semua lock direset')
  }
}
