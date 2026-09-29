// src/services/admin/SessionService.js
// Adapter HTTP untuk Sesi Ujian.
// Juga melayani ProctorService (alias).

import { api } from '@/boot/axios'

export const SessionService = {
  // ── CRUD + list
  list(params = {}) {
    return api.get('/admin/sessions', { params })
  },
  get(id) {
    return api.get(`/admin/sessions/${id}`)
  },
  update(id, payload) {
    return api.put(`/admin/sessions/${id}`, payload)
  },
  sync() {
    return api.post('/admin/sessions/sync')
  },

  // ── Aksi Control
  start(id) {
    return api.post(`/admin/sessions/${id}/start`)
  },
  pause(id) {
    return api.post(`/admin/sessions/${id}/pause`)
  },
  resume(id) {
    return api.post(`/admin/sessions/${id}/resume`)
  },
  end(id) {
    return api.post(`/admin/sessions/${id}/end`)
  },
  extend(id, minutes) {
    return api.post(`/admin/sessions/${id}/extend`, { minutes })
  },
  forceSubmit(id) {
    return api.post(`/admin/sessions/${id}/force-submit`)
  },
  regenerateToken(id) {
    return api.post(`/admin/sessions/${id}/regenerate-token`)
  },

  // ── Token (Exam Gate Token)
  getCurrentToken(id) {
    return api.get(`/admin/sessions/${id}/token`)
  },
  rotateToken(id) {
    return api.post(`/admin/sessions/${id}/token/rotate`)
  },

  // ── Detail monitoring
  getParticipants(id) {
    return api.get(`/admin/sessions/${id}/participants`)
  },
  getViolations(id) {
    return api.get(`/admin/sessions/${id}/violations`)
  },
  getActivities(id) {
    return api.get(`/admin/sessions/${id}/activities`)
  },

  // ── Compat dengan ProctorService lama
  listSessions({ examId = '', activeOnly = true } = {}) {
    const params = {}
    if (examId) params.exam_id = examId
    if (activeOnly) params.active_only = 'true'
    return api.get('/admin/sessions', { params })
  },
}
