import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/boot/axios'

export const useAdminDashboardStore = defineStore('adminDashboard', () => {
  const stats = ref({ totalParticipants: 0, totalExams: 0, activeSessions: 0, completedExams: 0 })
  const syncHistory = ref([])
  const isSyncing = ref(false)
  const sessions = ref([])
  const examsDropdown = ref([])

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get('/admin/dashboard/stats')
      stats.value = res.data
    } catch (error) {
      console.error('Gagal fetch stats:', error)
    }
  }

  const syncFromSiakad = async (pembelajaranId, semesterId) => {
    isSyncing.value = true
    try {
      const res = await api.post('/admin/sync', { pembelajaran_id: pembelajaranId, semester_id: semesterId })
      syncHistory.value.unshift({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        pembelajaran_id: pembelajaranId,
        semester_id: semesterId,
        synced_count: res.data.synced_count,
        message: res.data.message,
      })
      await fetchDashboardStats()
      return res.data
    } catch (error) {
      console.error('Sync gagal:', error)
      throw error
    } finally {
      isSyncing.value = false
    }
  }

  return { stats, syncHistory, isSyncing, sessions, examsDropdown, fetchDashboardStats, syncFromSiakad }
})
