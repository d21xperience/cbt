import { api } from '@/boot/axios'

export const ExamCardService = {
  list(params = {}) {
    return api.get('/admin/cards', { params })
  },
  create(payload) {
    return api.post('/admin/cards', payload)
  },
  revoke(nis) {
    return api.post(`/admin/cards/${nis}/revoke`)
  },
  resetDevice(nis) {
    return api.post(`/admin/cards/${nis}/reset-device`)
  },
  generateQr(nis) {
    return api.post(`/admin/cards/${nis}/generate-qr`)
  },
  markPrinted(id) {
    return api.post(`/admin/cards/${id}/mark-printed`)
  },
}
