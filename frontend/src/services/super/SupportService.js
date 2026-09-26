// src/services/super/SupportService.js
// Adapter HTTP untuk log komunikasi Service After-Sales.
//
// VER-012 PENDING (draft): path provisional `/super/support/logs`
// Schema: { id, school_name, contact_phone, message, direction,
//           status, timestamp, admin_notes }
//   direction ∈ { INBOUND, OUTBOUND }
//   status    ∈ { PENDING, REPLIED, RESOLVED }

import { api } from '@/boot/axios'

export const SupportService = {
  getLogs() {
    return api.get('/super/support/logs')
  },
  createLog(payload) {
    return api.post('/super/support/logs', payload)
  },
  updateLog(id, payload) {
    return api.put(`/super/support/logs/${id}`, payload)
  },
  deleteLog(id) {
    return api.delete(`/super/support/logs/${id}`)
  },
}
