// src/services/admin/ParticipantService.js
// Adapter HTTP untuk modul Data Peserta.

import { api } from '@/boot/axios'

export const ParticipantService = {
  getParticipants(params = {}) {
    return api.get('/admin/participants', { params })
  },
  deleteParticipant(id) {
    return api.delete(`/admin/participants/${id}`)
  },
  resetPassword(id) {
    return api.post(`/admin/participants/${id}/reset-password`)
  },
  parseImport(file, { exam_id, semester_id, school_name } = {}) {
    const formData = new FormData()
    formData.append('file', file)
    if (exam_id) formData.append('exam_id', exam_id)
    if (semester_id) formData.append('semester_id', semester_id)
    if (school_name) formData.append('school_name', school_name)
    return api.post('/admin/participants/import-external', formData, {
      params: { preview: 'true' },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  confirmImport({ exam_id, semester_id, school_name } = {}) {
    return api.post('/admin/participants/import-external', {
      exam_id,
      semester_id,
      school_name,
    })
  },
}
