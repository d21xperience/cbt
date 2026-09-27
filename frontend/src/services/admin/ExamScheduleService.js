// src/services/admin/ExamScheduleService.js
// Adapter HTTP untuk Jadwal Ujian (ExamSchedule) — Fase 2b-3-jadwal.

import { api } from '@/boot/axios'

export const ExamScheduleService = {
  list(params = {}) {
    return api.get('/admin/exam-schedules', { params })
  },
  createBatch(rows) {
    return api.post('/admin/exam-schedules/batch', { rows })
  },
  update(id, payload) {
    return api.put(`/admin/exam-schedules/${id}`, payload)
  },
  remove(id) {
    return api.delete(`/admin/exam-schedules/${id}`)
  },
}
