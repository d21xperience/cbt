// src/services/super/SuperDashboardService.js
import { api } from '@/boot/axios'

export const SuperDashboardService = {
  getStats() {
    return api.get('/super/dashboard/stats')
  },
  getLogs() {
    return api.get('/super/dashboard/logs')
  },
}
