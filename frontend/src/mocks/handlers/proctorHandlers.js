// src/mocks/handlers/proctorHandlers.js
import { mockProctorSessions } from '../data/proctorData'
import { mockProctorProfile } from '../data/proctorProfileData' // ← BARU
const DELAY = 300

export const proctorHandlers = (mock) => {
  // GET /proctor/sessions — daftar sesi yang diawasi proctor
  mock.onGet('/proctor/sessions').reply(() => {
    return [
      200,
      {
        status: 'ok',
        data: mockProctorSessions,
      },
      { delay: DELAY },
    ]
  })

  // GET /proctor/monitor/:sessionId
  mock.onGet(/\/proctor\/monitor\/[^/]+/).reply(() => {
    return [
      200,
      {
        status: 'ok',
        data: {
          session_id: 'mock-session',
          participants: [],
          violations: [],
        },
      },
      { delay: DELAY },
    ]
  })
  // ── BARU: GET /proctor/profile
  mock.onGet('/proctor/profile').reply(() => {
    return [200, { status: 'ok', data: mockProctorProfile }, { delay: DELAY }]
  })
}
