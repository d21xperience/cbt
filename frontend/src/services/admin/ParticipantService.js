// src/services/admin/ParticipantService.js
// Adapter HTTP untuk modul Data Peserta.
//
// Backend status (VER-003):
//   - GET /admin/participants                → NOT_READY (Phase 6)
//   - POST /admin/participants/import-external → READY (preview + commit)
//   - DELETE /admin/participants/:id         → NOT_READY (Phase 6)
//   - GET /admin/exams                       → perlu verifikasi

import { api } from '@/boot/axios'

export const ParticipantService = {
  /**
   * List peserta dengan filter opsional.
   * Phase 6 NOT_READY — mock-first.
   * @param {object} params - { exam_id, source, search, rombel }
   */
  getParticipants(params = {}) {
    return api.get('/admin/participants', { params })
  },

  /**
   * Dropdown ujian untuk filter.
   */
  getExams() {
    return api.get('/admin/exams')
  },

  /**
   * Hapus peserta (hanya EXTERNAL yang boleh).
   * Phase 6 NOT_READY.
   */
  deleteParticipant(id) {
    return api.delete(`/admin/participants/${id}`)
  },

  /**
   * Parse CSV untuk preview (tidak simpan DB).
   * Backend READY: POST /admin/participants/import-external
   * Gunakan flag ?preview=true untuk membedakan preview vs commit.
   */
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

  /**
   * Commit import (simpan ke DB).
   */
  confirmImport({ exam_id, semester_id, school_name } = {}) {
    return api.post('/admin/participants/import-external', {
      exam_id,
      semester_id,
      school_name,
    })
  },
}
