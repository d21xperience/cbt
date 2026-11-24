// src/services/admin/AcademicPeriodService.js
// Adapter HTTP untuk Tahun Ajaran (Academic Periods)

import { api } from '@/boot/axios'

export const AcademicPeriodService = {
  list() {
    return api.get('/admin/academic-periods')
  },
  create(payload) {
    // payload: { academic_year: '2026/2027', semester: 'GANJIL' }
    return api.post('/admin/academic-periods', payload)
  },
  activate(id) {
    return api.post(`/admin/academic-periods/${id}/activate`)
  },
}
