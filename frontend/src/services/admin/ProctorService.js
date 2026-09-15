// src/services/admin/ProctorService.js
import { api } from '@/boot/axios'

export const ProctorService = {
  // List sesi ujian
  listSessions({ examId = '', activeOnly = true } = {}) {
    const params = new URLSearchParams()
    if (examId) params.set('exam_id', examId)
    if (activeOnly) params.set('active_only', 'true')
    return api.get(`/admin/sessions?${params.toString()}`)
  },

  // Token aktif untuk sesi
  getCurrentToken(sessionId) {
    return api.get(`/admin/sessions/${sessionId}/token`)
  },

  // Rotate manual
  rotateToken(sessionId) {
    return api.post(`/admin/sessions/${sessionId}/token/rotate`)
  },
}
