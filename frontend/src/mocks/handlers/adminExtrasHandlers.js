// src/mocks/handlers/adminExtrasHandlers.js
// Mock untuk endpoint admin yang belum ada handler-nya:
//  - /admin/schedules-list, /admin/all-subjects-form, /admin/schedules-massal
//  - /admin/payments/*
//  - /admin/sync/history
//  - /admin/dashboard/stats (dengan total_questions)

const DELAY = 200

let schedules = []
let paymentBlocked = []

export const resetAdminExtrasMockData = () => {
  schedules = []
  paymentBlocked = []
  
}

export const adminExtrasHandlers = (mock) => {
  // ── Exam schedule management
  mock
    .onGet('/admin/schedules-list')
    .reply(() => [
      200,
      { status: 'ok', data: schedules, count: schedules.length },
      { delay: DELAY },
    ])

  mock.onGet('/admin/all-subjects-form').reply(() => {
    // Dummy: 6 mapel untuk form
    const subjects = [
      { subject_id: 'mtk', subject_name: 'Matematika' },
      { subject_id: 'ind', subject_name: 'Bahasa Indonesia' },
      { subject_id: 'ing', subject_name: 'Bahasa Inggris' },
      { subject_id: 'ipa', subject_name: 'IPA' },
      { subject_id: 'ips', subject_name: 'IPS' },
      { subject_id: 'pkn', subject_name: 'PKn' },
    ]
    return [200, subjects, { delay: DELAY }]
  })

  mock.onPost('/admin/schedules-massal').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    const { grade, major, schedules: items } = body
    const created = (items || []).map((it, i) => ({
      id: `sched-${Date.now()}-${i}`,
      grade_level: grade,
      major_id: major || null,
      subject_name: it.subject_name || 'Unknown',
      start_date: it.date,
      start_time: it.start_time,
      duration_minutes: it.duration,
    }))
    schedules = [...schedules, ...created]
    return [
      200,
      { status: 'ok', message: 'Jadwal tersimpan', created_count: created.length },
      { delay: DELAY },
    ]
  })

  // ── Payment gates
  mock
    .onGet('/admin/payments/blocked')
    .reply(() => [
      200,
      { status: 'ok', data: paymentBlocked, count: paymentBlocked.length },
      { delay: DELAY },
    ])

  mock.onPost('/admin/payments/block').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    if (!body.nisn) {
      return [400, { error: 'nisn wajib' }, { delay: DELAY }]
    }
    const exists = paymentBlocked.find((p) => p.nisn === body.nisn)
    if (!exists) {
      paymentBlocked.push({
        nisn: body.nisn,
        reason: body.reason || '',
        blocked_by: 'mock-admin',
        blocked_at: new Date().toISOString(),
      })
    }
    return [200, { status: 'ok', message: 'Peserta diblokir' }, { delay: DELAY }]
  })

  mock.onPost('/admin/payments/unblock').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    paymentBlocked = paymentBlocked.filter((p) => p.nisn !== body.nisn)
    return [200, { status: 'ok', message: 'Peserta di-unblock' }, { delay: DELAY }]
  })

  // ── Sync history
  mock
    .onGet('/admin/sync/history')
    .reply(() => [200, { status: 'ok', data: [], count: 0 }, { delay: DELAY }])

  // ── Admin dashboard stats (dengan total_questions)
  mock.onGet('/admin/dashboard/stats').reply(() => [
    200,
    {
      total_participants: 245,
      total_exams: 8,
      active_sessions: 3,
      completed_exams: 127,
      total_questions: 75,
    },
    { delay: DELAY },
  ])
    // ── Archive (Batch B1) — password verification
  let archiveHistory = [
    {
      id: 'arch-001',
      timestamp: '2026-08-15T10:00:00Z',
      semester_id: '20242',
      is_end_of_academic_year: false,
      archived_participants: 245,
      archived_exams: 12,
      archived_sessions: 8,
      performed_by: 'admin',
    },
  ]

  // Mock password — untuk dev saja. Backend REAL pakai bcrypt.
  // Password expected: 'admin123'
  const MOCK_ADMIN_PASSWORD = 'admin123'

  mock.onGet('/admin/archive/history').reply(() => {
    return [
      200,
      { status: 'ok', data: archiveHistory, count: archiveHistory.length },
      { delay: DELAY },
    ]
  })

  mock.onPost('/admin/archive').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] POST /admin/archive →', body.school_id, body.semester_id)

    // ── VERIFY password (mirror backend behavior)
    if (!body.password || body.password !== MOCK_ADMIN_PASSWORD) {
      console.warn('[MOCK] Archive: invalid password')
      return [
        401,
        { error: 'invalid_password', message: 'Password admin salah.' },
        { delay: DELAY },
      ]
    }

    const result = {
      archived_participants: 245,
      archived_exams: 12,
      archived_sessions: 8,
    }

    // Tambah ke history
    archiveHistory.unshift({
      id: `arch-${Date.now()}`,
      timestamp: new Date().toISOString(),
      semester_id: body.semester_id,
      is_end_of_academic_year: !!body.is_end_of_academic_year,
      archived_participants: result.archived_participants,
      archived_exams: result.archived_exams,
      archived_sessions: result.archived_sessions,
      performed_by: 'admin',
    })

    return [
      200,
      {
        status: 'ok',
        message: 'Archive berhasil',
        data: result,
      },
      { delay: DELAY },
    ]
  })
}
