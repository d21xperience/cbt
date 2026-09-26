// src/services/admin/ExamTypeService.js
// Adapter HTTP untuk Master Jenis Ujian.
// CR-M6 DRAFT: /admin/exam-types

import { api } from '@/boot/axios'

export const ExamTypeService = {
  list() {
    return api.get('/admin/exam-types')
  },
  create(payload) {
    return api.post('/admin/exam-types', payload)
  },
  update(id, payload) {
    return api.put(`/admin/exam-types/${id}`, payload)
  },
  remove(id) {
    return api.delete(`/admin/exam-types/${id}`)
  },
  downloadTemplate(format = 'csv') {
    return api.get('/admin/exam-types/template', {
      responseType: 'blob',
      params: { format },
    })
  },
  parseImport(file) {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/admin/exam-types/import', formData, {
      params: { preview: 'true' },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  confirmImport(rows) {
    return api.post('/admin/exam-types/import', { rows })
  },
}
