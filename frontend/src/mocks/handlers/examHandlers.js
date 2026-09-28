// src/mocks/handlers/examHandlers.js
// Handler /exam/* (singular, dipakai ActiveExamService) + /exams/* (plural, legacy)

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

// ── Lock state (per ujian) — untuk demo
const examLockState = {
  locked: false,
  lockLevel: 0, // 0 = unlocked, 1 = L1, 2 = L2
  warnings: 0, // counter 0–3
  violationCount: 0, // total pelanggaran
  lockCount: 0, // berapa kali sudah lock
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

  mock.onPost('/exam/telemetry').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    const eventType = body.event_type
    const reason = body.reason || mockTelemetry(eventType)?.reason || 'Pelanggaran terdeteksi'

    // Increment counters
    examLockState.violationCount += 1
    examLockState.warnings += 1

    // Cek threshold: 3x → LOCK
    if (examLockState.warnings >= 3 && !examLockState.locked) {
      examLockState.lockCount += 1
      examLockState.lockLevel = Math.min(examLockState.lockCount, 2)
      examLockState.locked = true

      console.warn(
        `🔒 [MOCK] VIOLATION → LOCK Level ${examLockState.lockLevel} (total: ${examLockState.violationCount})`,
      )

      return [
        200,
        {
          status: 'processed',
          action: 'LOCK',
          lockLevel: examLockState.lockLevel,
          warnings: examLockState.warnings,
          violationCount: examLockState.violationCount,
          reason:
            examLockState.lockLevel === 2
              ? 'Pelanggaran berulang. Hubungi Admin untuk membuka.'
              : 'Batas pelanggaran tercapai. Hubungi pengawas.',
        },
        { delay: DELAY },
      ]
    }

    console.log(`⚠️ [MOCK] Violation ${examLockState.warnings}/3: ${eventType} — ${reason}`)
    return [
      200,
      {
        status: 'processed',
        action: 'WARN',
        warnings: examLockState.warnings,
        violationCount: examLockState.violationCount,
        reason,
      },
      { delay: DELAY },
    ]
  })

  // ── GET /exam/lock-status — polling unlock
  mock.onGet('/exam/lock-status').reply(() => {
    return [
      200,
      {
        locked: examLockState.locked,
        lockLevel: examLockState.lockLevel,
        warnings: examLockState.warnings,
        violationCount: examLockState.violationCount,
        lockCount: examLockState.lockCount,
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

    if (!examLockState.locked) {
      return [200, { ok: false, message: 'Sesi tidak terkunci' }, { delay: DELAY }]
    }

    // Level 2 hanya admin
    if (examLockState.lockLevel === 2 && by !== 'ADMIN') {
      return [
        403,
        {
          ok: false,
          message: 'Level 2 hanya dapat dibuka oleh ADMIN',
        },
        { delay: DELAY },
      ]
    }

    // Reset warnings: L1 → 1 (sisa 2 kesempatan), L2 → 0
    const resetWarnings = examLockState.lockLevel === 2 ? 0 : 1
    examLockState.locked = false
    examLockState.warnings = resetWarnings
    const unlockedLevel = examLockState.lockLevel
    examLockState.lockLevel = 0

    console.log(`🔓 [MOCK] Unlock by ${by} — sisa kesempatan: ${3 - resetWarnings}`)

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
  window.__examLockState = examLockState
  window.__unlockExam = (by = 'PROCTOR') => {
    const resetWarnings = examLockState.lockLevel === 2 ? 0 : 1
    examLockState.locked = false
    examLockState.warnings = resetWarnings
    examLockState.lockLevel = 0
    console.log(
      `🔓 [DEMO] Unlock by ${by} — sisa ${3 - resetWarnings} kesempatan. ` +
        `Polling akan sync dalam ≤5 detik.`,
    )
  }
  window.__resetExamLock = () => {
    examLockState.locked = false
    examLockState.lockLevel = 0
    examLockState.warnings = 0
    examLockState.violationCount = 0
    examLockState.lockCount = 0
    console.log('🔄 [DEMO] Lock state direset')
  }
}
