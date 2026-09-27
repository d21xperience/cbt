// src/services/admin/RoomService.js
// Adapter HTTP untuk Master Ruang Ujian.

import { api } from '@/boot/axios'

export const RoomService = {
  list(params = {}) {
    return api.get('/admin/rooms', { params })
  },
  create(payload) {
    return api.post('/admin/rooms', payload)
  },
  update(id, payload) {
    return api.put(`/admin/rooms/${id}`, payload)
  },
  remove(id) {
    return api.delete(`/admin/rooms/${id}`)
  },
}
