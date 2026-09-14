import { scheduleService } from '@/services/exam/ScheduleService'
import { defineStore } from 'pinia'
import { ref } from 'vue'
// import { api } from '@/boot/axios'

export const useExamScheduleStore = defineStore('examSchedule', () => {
  const scheduleList = ref([])
  const selectedExamId = ref(null)
  const selectedExamName = ref('')

  const fetchSchedule = async () => {
    try {
      const res = scheduleService.getStudentSchedule()
      scheduleList.value = res.data
      return res.data
    } catch (error) {
      console.error('Gagal mengambil jadwal:', error)
    }
  }

  return { scheduleList, selectedExamId, selectedExamName, fetchSchedule }
})
