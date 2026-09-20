// src/services/exam/ScheduleService.js
import { api } from '@/boot/axios'

export const scheduleService = {
  /**
   * Ambil jadwal ujian siswa.
   *
   * VER-003: backend tidak punya /exam/schedule.
   * Data jadwal tersedia di /exam/dashboard (3-section response:
   * scheduled, makeup_available, completed).
   */
  getStudentSchedule() {
    return api.get('/exam/dashboard')
  },
}
