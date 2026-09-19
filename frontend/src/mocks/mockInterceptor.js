// src/mocks/mockInterceptor.js
import MockAdapter from 'axios-mock-adapter'
import { authHandlers } from './handlers/authHandlers'
import { adminHandlers } from './handlers/adminHandlers'
import { examHandlers } from './handlers/examHandlers'
import { questionHandlers } from './handlers/questionHandlers'
import { participantHandlers } from './handlers/participantHandlers'
import { resetMockData } from './data/stateStore'
import { billingHandlers } from './handlers/billingHandlers'
import { superAdminHandlers, resetOnboardingMockData } from './handlers/superAdminHandlers'
import { scheduleHandlers } from './handlers/scheduleHandlers'
import { examAssetHandlers } from './handlers/examAssetHandlers'
import { resetScheduleData } from './handlers/scheduleHandlers'
import { publicHandlers } from './handlers/publicHandlers' // ← BARU

if (typeof window !== 'undefined') {
  window.resetMockData = resetMockData
  window.resetScheduleData = resetScheduleData
  window.resetOnboardingMockData = resetOnboardingMockData // ← BARU
}

/**
 * Ribbon visual: indikator MOCK MODE aktif. Hanya DEV.
 */
const mountMockRibbon = () => {
  if (typeof document === 'undefined') return
  if (document.getElementById('__mock_mode_ribbon')) return

  const el = document.createElement('div')
  el.id = '__mock_mode_ribbon'
  el.textContent = '⚠ MOCK MODE'
  el.style.cssText = [
    'position:fixed',
    'top:0',
    'right:0',
    'z-index:99999',
    'background:#ff9800',
    'color:#fff',
    'font:600 11px/1.4 monospace',
    'padding:4px 10px',
    'border-bottom-left-radius:6px',
    'letter-spacing:1px',
    'pointer-events:none',
    'opacity:0.85',
  ].join(';')
  document.body.appendChild(el)
}

export const setupMockInterceptor = (api) => {
  const mock = new MockAdapter(api, { delayResponse: 300 })

  authHandlers(mock)
  adminHandlers(mock)
  examHandlers(mock)
  questionHandlers(mock)
  participantHandlers(mock)
  billingHandlers(mock)
  superAdminHandlers(mock)
  scheduleHandlers(mock)
  examAssetHandlers(mock)
  publicHandlers(mock) // ← BARU

  // Jangan passthrough /public/schools — sudah di-handle publicHandlers
  mock.onAny().passThrough()

  mountMockRibbon() // ← BARU

  console.log('✅ [MOCK] Interceptor siap dengan axios-mock-adapter')
}
