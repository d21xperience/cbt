// src/services/exam/ActiveExamService.js
// PHASE 3/5: aligned dengan backend /api/v1/cbt/exam/*
import { api } from '@/boot/axios'

export const ActiveExamService = {
  // ---- Participant listing ----
  getActiveExams() {
    return api.get('/exam/active')
  },
  getExamHistory() {
    return api.get('/exam/history')
  },

  // ---- Timer ----
  getTimer() {
    return api.get('/exam/timer')
  },

  // ---- Exam lifecycle ----
  startExam() {
    return api.post('/exam/start')
  },
  saveAnswer(questionId, answer) {
    return api.post('/exam/answer', { question_id: questionId, answer })
  },
  saveAnswersBatch(answers, idempotencyKey) {
    return api.post('/exam/answers/batch', {
      idempotency_key: idempotencyKey,
      answers,
    })
  },
  submitExam() {
    return api.post('/exam/submit')
  },

  // ---- Token (proctor gated) ----
  verifyToken(examId, token) {
    return api.post(`/exam/${examId}/verify-token`, { token })
  },

  // ---- Proctoring ----
  heartbeat() {
    return api.post('/exam/heartbeat')
  },
  sendTelemetry(eventType) {
    return api.post('/exam/telemetry', { event_type: eventType })
  },
}

// backward-compat alias
export const ExamService = ActiveExamService
