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
      const res = await api.post('/admin/sync', {
        pembelajaran_id: pembelajaranId,
        semester_id: semesterId,
      })
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

  // ============================================
  // D3a: Participants (defer full features ke D4)
  // ============================================
  const participants = ref([])
  const importPreview = ref([])
  const importErrors = ref([])
  const isImporting = ref(false)

  const fetchParticipants = async () => {
    try {
      const { data } = await api.get('/admin/participants')
      // Backend response: {status, data: [...]} — extract dengan guard
      participants.value = Array.isArray(data?.data) ? data.data : []
    } catch (error) {
      console.warn('[Participants] Endpoint belum tersedia atau error:', error.message)
      participants.value = []
    }
  }

  // Placeholder — implementasi penuh di D4
  const parseParticipantsFile = async () => {
    // TODO D4: parse CSV → return preview
    importPreview.value = []
    importErrors.value = []
  }

  const confirmImportParticipants = async () => {
    // TODO D4: confirm import ke backend
    return { imported_count: 0 }
  }

  const deleteParticipant = async (id) => {
    await api.delete(`/admin/participants/${id}`)
    await fetchParticipants()
  }

  return {
    stats,
    syncHistory,
    isSyncing,
    sessions,
    examsDropdown,
    fetchDashboardStats,
    syncFromSiakad,
    // D3a — participants
    participants,
    importPreview,
    importErrors,
    isImporting,
    fetchParticipants,
    parseParticipantsFile,
    confirmImportParticipants,
    deleteParticipant,
  }
})

export const useAdminStore = useAdminDashboardStore
