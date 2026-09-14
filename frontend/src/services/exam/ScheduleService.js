// # API jadwal & daftar ujian siswa
import { api } from '@/boot/axios'

export const scheduleService = {
  getStudentSchedule() {
    return api.get('/exams/schedule')
  },
}
