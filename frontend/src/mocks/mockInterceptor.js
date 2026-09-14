// src/mocks/mockInterceptor.js
import MockAdapter from 'axios-mock-adapter'
import { authHandlers } from './handlers/authHandlers'
import { adminHandlers } from './handlers/adminHandlers'
import { examHandlers } from './handlers/examHandlers'
import { questionHandlers } from './handlers/questionHandlers'
import { participantHandlers } from './handlers/participantHandlers'
import { resetMockData } from './data/stateStore'
// Handler baru dari src.pdf
import { billingHandlers } from './handlers/billingHandlers'
import { superAdminHandlers } from './handlers/superAdminHandlers'
import { scheduleHandlers } from './handlers/scheduleHandlers'
// ==========
import { examAssetHandlers } from './handlers/examAssetHandlers'
import { resetScheduleData } from './handlers/scheduleHandlers'
// Ekspos resetMockData ke global agar bisa dipanggil dari console (opsional)
if (typeof window !== 'undefined') {
  window.resetMockData = resetMockData
  window.resetScheduleData = resetScheduleData
}

/**
 * Setup mock interceptor menggunakan axios-mock-adapter
 * @param {import('axios').AxiosInstance} api - Instance Axios yang akan di-mock
 */
export const setupMockInterceptor = (api) => {
  const mock = new MockAdapter(api, { delayResponse: 300 }) // delay global opsional

  // Daftarkan semua handler
  authHandlers(mock)
  adminHandlers(mock)
  examHandlers(mock)
  questionHandlers(mock)
  participantHandlers(mock)
  billingHandlers(mock)
  superAdminHandlers(mock)
  scheduleHandlers(mock)
  examAssetHandlers(mock)
  // (Opsional) fallback untuk route yang tidak terdefinisi
  mock.onAny().passThrough() // atau .reply(404, { message: 'Mock not found' });

  console.log('✅ [MOCK] Interceptor siap dengan axios-mock-adapter')
}
