// src/services/admin/ExamService.js
// Adapter HTTP untuk Ujian. V2: find-or-create per kombinasi.

import { api } from '@/boot/axios'

export const ExamService = {
  list() {
    return api.get('/admin/exams')
  },
  /**
   * List exam per kelas.
   * @param {object} params - { class_id, jenis_ujian_id, academic_period_id }
   */
  listByClass(params = {}) {
    return api.get('/admin/exams', { params })
  },
  /**
   * List exam per mata pelajaran (untuk halaman Kelola Soal V2).
   * @param {object} params - { subject_id, jenis_ujian_id, academic_period_id }
   */
  listBySubject(params = {}) {
    return api.get('/admin/exams', { params })
  },
  /**
   * Find existing atau create baru.
   * Body: { jenis_ujian_id, subject_id, class_id, academic_period_id, custom_nama? }
   */
  findOrCreate(payload) {
    return api.post('/admin/exams/find-or-create', payload)
  },
  remove(id) {
    return api.delete(`/admin/exams/${id}`)
  },
}
