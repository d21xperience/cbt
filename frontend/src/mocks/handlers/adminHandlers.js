// src/mocks/handlers/adminHandlers.js
import { mockDashboardStats, mockSyncHistory, mockExams, mockSyncResponse } from '../data/adminData'

import {
  getSessions,
  addSession,
  removeSession,
  // getParticipants,
  getUsers,
} from '../data/stateStore'

const DELAY = 300
const SYNC_DELAY = 2000

export const adminHandlers = (mock) => {
  // Dashboard Stats
  mock.onGet('/admin/dashboard/stats').reply(() => {
    return [200, mockDashboardStats, { delay: DELAY }]
  })

  // Sync SIAKAD
  mock.onPost(/\/admin\/sync(?!\/history)/).reply((config) => {
    const body = JSON.parse(config.data)
    const response = mockSyncResponse(body.pembelajaran_id, body.semester_id)
    return [200, response, { delay: SYNC_DELAY }]
  })

  // Sync History
  mock.onGet('/admin/sync/history').reply(() => {
    return [200, mockSyncHistory, { delay: DELAY }]
  })

  // Get Sessions
  mock.onGet('/admin/sessions').reply(() => {
    const sessions = getSessions()
    console.log(`📦 [MOCK] Sessions loaded: ${sessions.length} item`)
    return [200, sessions, { delay: DELAY }]
  })

  // Get Exams (dropdown)
  mock.onGet('/admin/exams').reply(() => {
    console.log(`📋 [MOCK] Exams loaded: ${mockExams.length}`)
    return [200, mockExams, { delay: DELAY }]
  })

  // Create Session
  mock.onPost('/admin/session').reply((config) => {
    const body = JSON.parse(config.data)
    const newSession = {
      id: 'sess-' + Date.now(),
      exam_id: body.exam_id,
      exam_name: mockExams.find((e) => e.id === body.exam_id)?.name || 'Unknown Exam',
      session_type: body.session_type,
      start_time: body.start_time,
      end_time: body.end_time,
      status: 'SCHEDULED',
      participant_count: 0,
    }
    addSession(newSession)
    console.log(`✅ [MOCK] Session BARU dibuat: ${newSession.id}`)
    return [
      200,
      { message: 'Sesi ujian berhasil dibuat', session_id: newSession.id },
      { delay: DELAY },
    ]
  })

  // Delete Session (dynamic ID)
  mock.onDelete(/\/admin\/session\/[\w-]+$/).reply((config) => {
    const sessionId = config.url.split('/').pop()
    const deleted = removeSession(sessionId)
    if (deleted) {
      console.log(`🗑️ [MOCK] Session "${sessionId}" berhasil dihapus`)
      return [200, { message: 'Sesi berhasil dihapus' }, { delay: DELAY }]
    } else {
      console.warn(`⚠️ [MOCK] Session "${sessionId}" TIDAK DITEMUKAN`)
      return [200, { message: 'Sesi tidak ditemukan' }, { delay: DELAY }] // tetap 200 agar frontend tidak error
    }
  })

  // User Management
  mock.onGet('/admin/manajemen/users').reply(() => {
    const users = getUsers()
    console.log('user loaded')
    return [200, users, { delay: DELAY }]
  })

  // Archive History
  // mock.onGet('/admin/archive/history').reply(() => {
  //   console.log('📜 [MOCK] Archive history loaded')
  //   return [200, mockArchiveHistory, { delay: DELAY }]
  // })

  // Perform Archive
  // mock.onPost('/admin/archive').reply((config) => {
  //   const body = JSON.parse(config.data)
  //   const response = mockArchiveResponse(body.is_end_of_academic_year)
  //   console.log(`📦 [MOCK] Archive performed: ${response.archived_participants} participants`)
  //   return [200, response, { delay: 2000 }]
  // })
}
