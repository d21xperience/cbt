// src/services/admin/ScheduleService.js
import { api } from '@/boot/axios'

export const ScheduleService = {
  getSchedulesList() {
    return api.get('/admin/schedules-list')
  },
  getMajors() {
    return api.get('/admin/majors')
  },
  getSubjectsForForm() {
    return api.get('/admin/all-subjects-form')
  },
  saveMassalSchedules({ grade, major, schedules }) {
    return api.post('/admin/schedules-massal', { grade, major, schedules })
  },
}
