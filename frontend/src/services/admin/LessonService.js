// src/services/admin/LessonService.js
// Adapter HTTP untuk Master Pembelajaran.
// CR-M7 DRAFT: /admin/lessons

import { api } from '@/boot/axios'

export const LessonService = {
  list() {
    return api.get('/admin/lessons')
  },
  create(payload) {
    return api.post('/admin/lessons', payload)
  },
  update(id, payload) {
    return api.put(`/admin/lessons/${id}`, payload)
  },
  remove(id) {
    return api.delete(`/admin/lessons/${id}`)
  },
  downloadTemplate(format = 'csv') {
    return api.get('/admin/lessons/template', {
      responseType: 'blob',
      params: { format },
    })
  },
  parseImport(file) {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/admin/lessons/import', formData, {
      params: { preview: 'true' },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  confirmImport(rows) {
    return api.post('/admin/lessons/import', { rows })
  },
}
