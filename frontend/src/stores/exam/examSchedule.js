// src/stores/exam/examSchedule.js
import { scheduleService } from '@/services/exam/ScheduleService'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useExamScheduleStore = defineStore('examSchedule', () => {
  const scheduleList = ref([])
  const selectedExamId = ref(null)
  const selectedExamName = ref('')
  const loading = ref(false)
  const error = ref(null)

  // ── Fetch (extract dari { data: { scheduled, ... } })
  const fetchSchedule = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await scheduleService.getStudentSchedule() // ← await
      const payload = res?.data?.data
      scheduleList.value = Array.isArray(payload?.scheduled) ? payload.scheduled : []
      return scheduleList.value
    } catch (err) {
      console.error('[examSchedule] fetchSchedule error:', err)
      error.value = err
      scheduleList.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  // ── Alias kompat Dashboard (return { data } shape)
  const getSchedule = async () => {
    const list = await fetchSchedule()
    return { data: list }
  }

  // ── Selection helper
  const setCurrentExam = (id, name) => {
    selectedExamId.value = id
    selectedExamName.value = name
  }

  // ── Info helper (placeholder untuk F0.7b)
  const showExamInfo = (exam) => {
    console.info('[examSchedule] Info:', exam)
  }

  return {
    scheduleList,
    selectedExamId,
    selectedExamName,
    loading,
    error,
    fetchSchedule,
    getSchedule,
    setCurrentExam,
    showExamInfo,
  }
})
