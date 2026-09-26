// src/services/admin/QuestionService.js
// Adapter HTTP untuk modul Kelola Soal.

import { api } from '@/boot/axios'

export const QuestionService = {
  // ── Template + upload (existing)
  downloadTemplate(format = 'csv') {
    return api.get('/admin/questions/template', {
      responseType: 'blob',
      params: { format },
    })
  },
  parseFile(file, examId) {
    const formData = new FormData()
    formData.append('exam_id', examId)
    formData.append('file', file)
    return api.post('/admin/questions/parse', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  submitBulkQuestions(examId, questions) {
    return api.post('/admin/questions/paste', { exam_id: examId, questions })
  },
  getExams() {
    return api.get('/admin/exams')
  },

  // ── CRUD soal per exam (BARU — Fase 2b-1)
  getExam(examId) {
    return api.get(`/admin/exams/${examId}`)
  },
  listQuestions(examId) {
    return api.get('/admin/questions', { params: { exam_id: examId } })
  },
  getQuestion(questionId) {
    return api.get(`/admin/questions/${questionId}`)
  },
  createQuestion(payload) {
    return api.post('/admin/questions', payload)
  },
  updateQuestion(questionId, payload) {
    return api.put(`/admin/questions/${questionId}`, payload)
  },
  deleteQuestion(questionId) {
    return api.delete(`/admin/questions/${questionId}`)
  },
}
