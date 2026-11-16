import { api } from '@/boot/axios'

export const ExamScheduleService = {
  list() {
    return api.get('/admin/exam-schedules')
  },
  create(payload) {
    return api.post('/admin/exam-schedules', payload)
  },
  update(id, payload) {
    return api.put(`/admin/exam-schedules/${id}`, payload)
  },
  remove(id) {
    return api.delete(`/admin/exam-schedules/${id}`)
  },
}
