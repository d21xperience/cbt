// src/services/admin/MakeupService.js
// Adapter HTTP untuk Ujian Susulan.
// CR-MAKEUP DRAFT: /admin/makeup

import { api } from '@/boot/axios'

export const MakeupService = {
  /**
   * List siswa yang belum / sedang / sudah mengikuti ujian susulan.
   * @param {object} params - { status, class_id, subject_id }
   */
  list(params = {}) {
    return api.get('/admin/makeup', { params })
  },
  /**
   * Trigger susulan untuk satu siswa.
   */
  start(studentId, examId) {
    return api.post(`/admin/makeup/${studentId}/start`, { exam_id: examId })
  },
}
