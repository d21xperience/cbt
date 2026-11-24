// src/services/admin/ExamService.js

import { api } from '@/boot/axios'

export const ExamService = {
  list() {
    return api.get('/admin/exams')
  },
  listByClass(params = {}) {
    return api.get('/admin/exams', { params })
  },
  listBySubject(params = {}) {
    return api.get('/admin/exams', { params })
  },
  findOrCreate(payload) {
    return api.post('/admin/exams/find-or-create', payload)
  },
  remove(id) {
    return api.delete(`/admin/exams/${id}`)
  },
  listQuestions(examId) {
    return api.get(`/admin/questions?exam_id=${examId}`)
  },
  deleteQuestionsByExam(examId) {
    return api.delete(`/admin/exams/${examId}/questions`)
  },
  importQuestions(examId, questions) {
    return api.post('/admin/questions/import', { exam_id: examId, questions })
  },
}
