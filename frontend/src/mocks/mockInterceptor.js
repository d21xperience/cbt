// src/mocks/mockInterceptor.js
import MockAdapter from 'axios-mock-adapter'

// ── Base handlers
import { authHandlers } from './handlers/authHandlers'
import { adminHandlers } from './handlers/adminHandlers'
import { examHandlers } from './handlers/examHandlers'
import { questionHandlers } from './handlers/questionHandlers'
import { participantHandlers } from './handlers/participantHandlers'
import { resetMockData } from './data/stateStore'
import { billingHandlers, resetBillingMockData } from './handlers/billingHandlers'
import { superAdminHandlers, resetOnboardingMockData } from './handlers/superAdminHandlers'
import { scheduleHandlers, resetScheduleData } from './handlers/scheduleHandlers'
import { examAssetHandlers } from './handlers/examAssetHandlers'
import { publicHandlers } from './handlers/publicHandlers'
import { proctorHandlers } from './handlers/proctorHandlers' // ← KRITIS
import { examDashboardHandlers } from './handlers/examDashboardHandlers' // ← KRITIS
import { keahlianHandlers, resetKeahlianMockData } from './handlers/keahlianHandlers'
import { adminExtrasHandlers, resetAdminExtrasMockData } from './handlers/adminExtrasHandlers' // ← KRITIS
import { supportHandlers, resetSupportMockData } from './handlers/supportHandlers'
import { participantsHandlers, resetParticipantsMockData } from './handlers/participantsHandlers'
import { schoolProfileHandlers, resetSchoolProfileMockData } from './handlers/schoolProfileHandlers'
import { subjectsHandlers, resetSubjectsMockData } from './handlers/subjectsHandlers'
import { classesHandlers, resetClassesMockData } from './handlers/classesHandlers'
import { teachersHandlers, resetTeachersMockData } from './handlers/teachersHandlers'
import { studentsHandlers, resetStudentsMockData } from './handlers/studentsHandlers'
import { examTypesHandlers, resetExamTypesMockData } from './handlers/examTypesHandlers'
import { lessonsHandlers, resetLessonsMockData } from './handlers/lessonsHandlers'
import { examsHandlers, resetExamsMockData } from './handlers/examsHandlers'
import { makeupHandlers, resetMakeupMockData } from './handlers/makeupHandlers'
import { questionCrudHandlers, resetQuestionCrudMockData } from './handlers/questionCrudHandlers'

import {
  infrastructureHandlers,
  resetInfrastructureMockData,
} from './handlers/infrastructureHandlers'

// ── Expose reset helpers
if (typeof window !== 'undefined') {
  window.resetMockData = resetMockData
  window.resetScheduleData = resetScheduleData
  window.resetOnboardingMockData = resetOnboardingMockData
  window.resetKeahlianMockData = resetKeahlianMockData
  window.resetAdminExtrasMockData = resetAdminExtrasMockData
  window.resetSupportMockData = resetSupportMockData
  window.resetInfrastructureMockData = resetInfrastructureMockData
  window.resetBillingMockData = resetBillingMockData
  window.resetParticipantsMockData = resetParticipantsMockData
  window.resetSchoolProfileMockData = resetSchoolProfileMockData
  window.resetSubjectsMockData = resetSubjectsMockData
  window.resetClassesMockData = resetClassesMockData
  window.resetTeachersMockData = resetTeachersMockData
  window.resetStudentsMockData = resetStudentsMockData
  window.resetExamTypesMockData = resetExamTypesMockData
  window.resetLessonsMockData = resetLessonsMockData
  window.resetExamsMockData = resetExamsMockData
  window.resetMakeupMockData = resetMakeupMockData
  window.resetQuestionCrudMockData = resetQuestionCrudMockData
}

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

  // ── Register semua handler
  authHandlers(mock)
  adminHandlers(mock)
  examHandlers(mock)
  questionHandlers(mock)
  participantHandlers(mock)
  billingHandlers(mock)
  superAdminHandlers(mock)
  scheduleHandlers(mock)
  examAssetHandlers(mock)
  publicHandlers(mock)
  proctorHandlers(mock) // ← KRITIS untuk ProctorDashboard
  examDashboardHandlers(mock)
  keahlianHandlers(mock)
  adminExtrasHandlers(mock) // ← KRITIS untuk /admin/dashboard/stats
  supportHandlers(mock)
  infrastructureHandlers(mock)
  participantsHandlers(mock)
  schoolProfileHandlers(mock)
  subjectsHandlers(mock)
  classesHandlers(mock)
  teachersHandlers(mock)
  studentsHandlers(mock)
  examTypesHandlers(mock)
  lessonsHandlers(mock)
  examsHandlers(mock)
  makeupHandlers(mock)
  questionCrudHandlers(mock)
  // =====================================
  // Pass-through
  mock.onAny().passThrough()
  mountMockRibbon()
  console.log('✅ [MOCK] Interceptor siap dengan axios-mock-adapter')
}
