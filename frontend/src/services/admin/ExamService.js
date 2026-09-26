// src/services/admin/ExamService.js
// Adapter HTTP untuk Ujian. V2: find-or-create per kombinasi.

import { api } from '@/boot/axios'

export const ExamService = {
  list() {
    return api.get('/admin/exams')
  },
  /**
   * List exam per kelas.
   * @param {object} params - { class_id, jenis_ujian_id, academic_year, semester }
   */
  listByClass(params = {}) {
    return api.get('/admin/exams', { params })
  },
  /**
   * Find existing atau create baru.
   * Body: { jenis_ujian_id, subject_id, class_id, academic_year, semester, custom_nama? }
   */
  findOrCreate(payload) {
    return api.post('/admin/exams/find-or-create', payload)
  },
  remove(id) {
    return api.delete(`/admin/exams/${id}`)
  },
}
