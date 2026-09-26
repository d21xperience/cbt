// src/services/admin/SubjectService.js
// Adapter HTTP untuk Master Mata Pelajaran.
// CR-M3 DRAFT: CRUD + import /admin/subjects

import { api } from '@/boot/axios'

export const SubjectService = {
  list() {
    return api.get('/admin/subjects')
  },
  create(payload) {
    return api.post('/admin/subjects', payload)
  },
  update(id, payload) {
    return api.put(`/admin/subjects/${id}`, payload)
  },
  remove(id) {
    return api.delete(`/admin/subjects/${id}`)
  },

  // ── Import CSV/Excel (pattern sama seperti participants)
  downloadTemplate(format = 'csv') {
    return api.get('/admin/subjects/template', {
      responseType: 'blob',
      params: { format },
    })
  },

  /**
   * Parse file → preview (TIDAK simpan DB).
   */
  parseImport(file) {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/admin/subjects/import', formData, {
      params: { preview: 'true' },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /**
   * Commit import — simpan ke DB.
   */
  confirmImport(rows) {
    return api.post('/admin/subjects/import', { rows })
  },
}
