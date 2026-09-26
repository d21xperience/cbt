// src/services/admin/ProgramKeahlianService.js
// Adapter HTTP untuk modul Master Bidang & Program Keahlian.
// VER-007 Extension + VER-008 (2026-09-20): READY, verified 23/23.
//
// CATATAN VER-008:
//  - bidang_nama SELALU embedded di semua response
//  - Non-SMK: GET /admin/programs return {data:[],count:0} HTTP 200 (bukan 404)
//  - Tidak ada field is_smk — frontend tentukan UI dari jenjang

import { api } from '@/boot/axios'

export const ProgramKeahlianService = {
  // ── Public references (no auth, no tenant)
  getBidangKeahlian() {
    return api.get('/public/references/bidang-keahlian', {
      skipAuth: true,
      skipTenant: true,
    })
  },

  /**
   * @param {object} [opts]
   * @param {string} [opts.bidang]       - filter by kode bidang (mis. "TI")
   * @param {boolean} [opts.onlyDefault] - hanya program default
   */
  getProgramKeahlian({ bidang, onlyDefault } = {}) {
    const params = {}
    if (bidang) params.bidang = bidang
    if (onlyDefault) params.default = 'true'
    return api.get('/public/references/program-keahlian', {
      params,
      skipAuth: true,
      skipTenant: true,
    })
  },

  // ── Admin (JWT + tenant scope)
  findOrCreateProgram({ kode, nama, bidang_id, deskripsi = '' }) {
    return api.post('/admin/program-keahlian/find-or-create', {
      kode,
      nama,
      bidang_id,
      deskripsi,
    })
  },

  /**
   * Program yang di-assign ke tenant ini.
   * Non-SMK → {data:[],count:0} HTTP 200 (bukan 404).
   */
  getAssignedPrograms() {
    return api.get('/admin/programs')
  },

  assignProgram(programId) {
    return api.post('/admin/programs/assign', { program_id: programId })
  },

  removeProgram(programId) {
    return api.post('/admin/programs/remove', { program_id: programId })
  },
}
