// # API pengerjaan, deteksi telemetri, & heartbeat
// src/services/ExamService.js
import { api } from '@/boot/axios'

export const ExamService = {
  // Ambil daftar ujian untuk peserta (hari ini)
  getTodayExams() {
    return api.get('/exams/active')
  },

  // Ambil riwayat ujian peserta
  getExamHistory() {
    return api.get('/exams/history')
  },

  // Verifikasi token sebelum masuk ujian
  verifyToken(participantId, examId, token) {
    return api.post(`/exams/${examId}/verify-token`, {
      participant_id: participantId,
      exam_id: examId,
      token: token,
    })
  },

  // Mulai ujian (dapatkan session)
  startExam(examId) {
    return api.post(`/exams/${examId}/start`)
  },

  getActiveExams(participantId) {
    return api.get('/exams/active', { params: { participant_id: participantId } })
  },
}
