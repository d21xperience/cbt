// src/services/proctor/ProctorMonitoringService.js
import { api } from '@/boot/axios'

export const ProctorMonitoringService = {
  /**
   * Ambil daftar siswa di sesi + lock state-nya.
   */
  listStudents(sessionId) {
    return api.get(`/proctor/sessions/${sessionId}/students`)
  },

  /**
   * Unlock siswa. by = 'PROCTOR' | 'ADMIN'.
   */
  unlockStudent(sessionId, studentId, by = 'PROCTOR') {
    return api.post(`/proctor/sessions/${sessionId}/students/${studentId}/unlock`, { by })
  },
}
