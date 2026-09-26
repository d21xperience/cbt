// src/services/admin/StudentService.js
// Adapter HTTP untuk Master Siswa.
// CR-M5 DRAFT: /admin/students

import { api } from '@/boot/axios'

export const StudentService = {
  list() {
    return api.get('/admin/students')
  },
  create(payload) {
    return api.post('/admin/students', payload)
  },
  update(id, payload) {
    return api.put(`/admin/students/${id}`, payload)
  },
  remove(id) {
    return api.delete(`/admin/students/${id}`)
  },
  downloadTemplate(format = 'csv') {
    return api.get('/admin/students/template', {
      responseType: 'blob',
      params: { format },
    })
  },
  parseImport(file) {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/admin/students/import', formData, {
      params: { preview: 'true' },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  confirmImport(rows) {
    return api.post('/admin/students/import', { rows })
  },
}
