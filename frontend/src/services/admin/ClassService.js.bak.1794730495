// src/services/admin/ClassService.js
// Adapter HTTP untuk Master Kelas/Rombel.
// CR-M2 DRAFT: /admin/classes
// Ref: program_keahlian → /admin/programs (existing)

import { api } from '@/boot/axios'

export const ClassService = {
  list() {
    return api.get('/admin/classes')
  },
  create(payload) {
    return api.post('/admin/classes', payload)
  },
  update(id, payload) {
    return api.put(`/admin/classes/${id}`, payload)
  },
  remove(id) {
    return api.delete(`/admin/classes/${id}`)
  },

  // ── Ref dropdowns
  listTeachers() {
    return api.get('/admin/teachers')
  },

  // ── Import
  downloadTemplate(format = 'csv') {
    return api.get('/admin/classes/template', {
      responseType: 'blob',
      params: { format },
    })
  },
  parseImport(file) {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/admin/classes/import', formData, {
      params: { preview: 'true' },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  confirmImport(rows) {
    return api.post('/admin/classes/import', { rows })
  },
}
