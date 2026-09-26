// src/services/admin/TeacherService.js
// Adapter HTTP untuk Master Guru.
// CR-M4 DRAFT: /admin/teachers

import { api } from '@/boot/axios'

export const TeacherService = {
  list() {
    return api.get('/admin/teachers')
  },
  create(payload) {
    return api.post('/admin/teachers', payload)
  },
  update(id, payload) {
    return api.put(`/admin/teachers/${id}`, payload)
  },
  remove(id) {
    return api.delete(`/admin/teachers/${id}`)
  },
  downloadTemplate(format = 'csv') {
    return api.get('/admin/teachers/template', {
      responseType: 'blob',
      params: { format },
    })
  },
  parseImport(file) {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/admin/teachers/import', formData, {
      params: { preview: 'true' },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  confirmImport(rows) {
    return api.post('/admin/teachers/import', { rows })
  },
}
