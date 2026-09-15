//  # API statistik & sinkronisasi SIAKAD
import { api } from '@/boot/axios'

export const dashboardService = {
  getStats() {
    return api.get('/admin/dashboard/stats')
  },

  syncFromSiakad(pembelajaranId, semesterId) {
    return api.post('/admin/sync', {
      pembelajaran_id: pembelajaranId,
      semester_id: semesterId,
    })
  },

  getSyncHistory() {
    return api.get('/admin/sync/history')
  },
}
