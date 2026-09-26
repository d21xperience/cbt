// src/services/admin/ExamCardService.js
// Adapter HTTP untuk Kartu Ujian — Fase 2b-3a

import { api } from '@/boot/axios'

export const ExamCardService = {
  list(params = {}) {
    return api.get('/admin/cards', { params })
  },
  create(payload) {
    return api.post('/admin/cards', payload)
  },
  revoke(id) {
    return api.post(`/admin/cards/${id}/revoke`)
  },
  resetDevice(id) {
    return api.post(`/admin/cards/${id}/reset-device`)
  },
  markPrinted(id) {
    return api.post(`/admin/cards/${id}/mark-printed`)
  },
}
