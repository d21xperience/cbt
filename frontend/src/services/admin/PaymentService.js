// src/services/admin/PaymentService.js
import { api } from '@/boot/axios'

export const PaymentService = {
  getBlockedList() {
    return api.get('/admin/payments/blocked')
  },
  blockParticipant({ nisn, reason }) {
    return api.post('/admin/payments/block', { nisn, reason })
  },
  unblockParticipant(nisn, note = 'Unblock manual') {
    return api.post('/admin/payments/unblock', { nisn, note })
  },
}
