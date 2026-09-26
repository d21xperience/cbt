// src/stores/admin/dashboard.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/boot/axios'

// ── Mapper: normalisasi response backend → frontend model
const mapDashboardStats = (d = {}) => ({
  totalParticipants: d.total_participants ?? d.totalParticipants ?? 0,
  totalExams: d.total_exams ?? d.totalExams ?? 0,
  activeSessions: d.active_sessions ?? d.activeSessions ?? 0,
  completedExams: d.completed_exams ?? d.completedExams ?? 0,
  totalQuestions: d.total_questions ?? d.totalQuestions ?? 0,
})

export const useAdminDashboardStore = defineStore('adminDashboard', () => {
  const stats = ref(mapDashboardStats())
  const syncHistory = ref([])
  const isSyncing = ref(false)
  const sessions = ref([])
  const examsDropdown = ref([])
  // ── Archive state + actions (Batch B1)
  const archiveHistory = ref([])
  const isArchiving = ref(false)
  // ── NEVER THROWS — selalu resolve (return void)
  const fetchDashboardStats = async () => {
    try {
      const res = await api.get('/admin/dashboard/stats')
      stats.value = mapDashboardStats(res.data)
    } catch (error) {
      console.warn('[AdminDashboard] fetch stats failed:', error?.message)
      // Jangan reset — biarkan data lama
    }
  }

  // ── NEVER THROWS
  const fetchSyncHistory = async () => {
    try {
      const res = await api.get('/admin/sync/history')
      const payload = res?.data
      // Dukung 2 format: {status, data} atau array langsung
      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : []
      syncHistory.value = list
    } catch (error) {
      // 404 expected — jangan spam console
      if (error?.response?.status !== 404) {
        console.warn('[AdminDashboard] fetch sync history failed:', error?.message)
      }
      syncHistory.value = []
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
      console.error('[AdminDashboard] sync failed:', error)
      throw error
    } finally {
      isSyncing.value = false
    }
  }

  // ── Participants (Phase 6 — graceful fallback)
  const participants = ref([])
  const importPreview = ref([])
  const importErrors = ref([])
  const isImporting = ref(false)

  const fetchParticipants = async () => {
    try {
      const { data } = await api.get('/admin/participants')
      participants.value = Array.isArray(data?.data) ? data.data : []
    } catch (error) {
      if (error?.response?.status !== 404) {
        console.warn('[Participants] fetch error:', error?.message)
      }
      participants.value = []
    }
  }

  const parseParticipantsFile = async () => {
    importPreview.value = []
    importErrors.value = []
  }

  const confirmImportParticipants = async () => {
    throw new Error('Fitur import peserta belum tersedia (Phase 6).')
  }

  const deleteParticipant = async (id) => {
    await api.delete(`/admin/participants/${id}`)
    await fetchParticipants()
  }

  const fetchArchiveHistory = async () => {
    try {
      const res = await api.get('/admin/archive/history')
      const payload = res?.data
      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : []
      archiveHistory.value = list
    } catch (error) {
      if (error?.response?.status !== 404) {
        console.warn('[AdminDashboard] fetch archive history failed:', error?.message)
      }
      archiveHistory.value = []
    }
  }

  /**
   * Trigger archive dengan password verification.
   * VER-015: backend WAJIB verify password (bcrypt compare).
   * @param {object} payload
   * @param {string} payload.school_id
   * @param {string} payload.semester_id
   * @param {boolean} payload.is_end_of_academic_year
   * @param {string} payload.password   ← BARU (dikirim ke backend)
   */
  const performArchive = async (payload) => {
    isArchiving.value = true
    try {
      const res = await api.post('/admin/archive', {
        school_id: payload.school_id,
        semester_id: payload.semester_id,
        is_end_of_academic_year: !!payload.is_end_of_academic_year,
        password: payload.password,
      })
      const data = res?.data?.data || res?.data || {}
      await fetchArchiveHistory()
      return {
        archived_participants: data.archived_participants ?? 0,
        archived_exams: data.archived_exams ?? 0,
        archived_sessions: data.archived_sessions ?? 0,
      }
    } finally {
      isArchiving.value = false
    }
  }

  return {
    stats,
    syncHistory,
    isSyncing,
    sessions,
    examsDropdown,
    fetchDashboardStats,
    fetchSyncHistory,
    syncFromSiakad,
    participants,
    importPreview,
    importErrors,
    isImporting,
    fetchParticipants,
    parseParticipantsFile,
    confirmImportParticipants,
    deleteParticipant,
    // Archive (Batch B1)
    archiveHistory,
    isArchiving,
    fetchArchiveHistory,
    performArchive,
  }
})

export const useAdminStore = useAdminDashboardStore
