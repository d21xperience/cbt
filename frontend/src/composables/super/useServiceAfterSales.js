// src/composables/super/useServiceAfterSales.js
//
// Composable: UI orchestration untuk halaman Service After-Sales.
// Responsibility:
//   - state: logs, loading, submitting, errorState
//   - filter: searchQuery, directionFilter, statusFilter
//   - fetch + create + update + delete (via Service)
//   - error handling terklasifikasi
//
// BUKAN responsibility:
//   - business rule
//   - HTTP detail (delegasi ke SupportService)

import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { SupportService } from '@/services/super/SupportService'

export function useServiceAfterSales() {
  const $q = useQuasar()

  // ── State
  const logs = ref([])
  const loading = ref(false)
  const submitting = ref(false)
  const errorState = ref(null)
  // null | 'endpoint_not_ready' | 'network_error' | 'server_error' | 'contract_mismatch'

  // ── Filter state
  const searchQuery = ref('')
  const directionFilter = ref('ALL')
  const statusFilter = ref('ALL')

  // ── Fetch
  const fetchLogs = async () => {
    loading.value = true
    try {
      const res = await SupportService.getLogs()
      const data = res?.data

      // Contract validation eksplisit
      if (!Array.isArray(data)) {
        errorState.value = 'contract_mismatch'
        console.warn('[useServiceAfterSales] contract mismatch', {
          type: typeof data,
        })
        return
      }

      logs.value = data
      errorState.value = null
    } catch (error) {
      const status = error?.response?.status

      if (status === 404) {
        errorState.value = 'endpoint_not_ready'
        return
      }
      if (!error.response) {
        errorState.value = 'network_error'
        return
      }
      errorState.value = 'server_error'
      console.warn('[useServiceAfterSales] server error:', status, error.message)
    } finally {
      loading.value = false
    }
  }

  // ── Create
  const createLog = async (payload) => {
    submitting.value = true
    try {
      const res = await SupportService.createLog(payload)
      const created = res?.data?.data
      if (created && typeof created === 'object') {
        logs.value = [created, ...logs.value]
      } else {
        await fetchLogs()
      }
      $q.notify({ type: 'positive', message: 'Log komunikasi berhasil disimpan.' })
      return { success: true, data: created }
    } catch (error) {
      const status = error?.response?.status
      $q.notify({
        type: 'negative',
        message:
          error.response?.data?.message || error.response?.data?.error || 'Gagal menyimpan log.',
      })
      // Conflict = nomor sudah ada dsb — biarkan caller tahu
      if (status === 409) {
        return { success: false, error: 'duplicate', message: error.response?.data?.message }
      }
      return { success: false, error: 'error' }
    } finally {
      submitting.value = false
    }
  }

  // ── Update
  const updateLog = async (id, payload) => {
    submitting.value = true
    try {
      await SupportService.updateLog(id, payload)
      await fetchLogs()
      $q.notify({ type: 'positive', message: 'Log berhasil diperbarui.' })
      return { success: true }
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: error.response?.data?.error || 'Gagal memperbarui log.',
      })
      return { success: false }
    } finally {
      submitting.value = false
    }
  }

  // ── Delete
  const deleteLog = async (id) => {
    try {
      await SupportService.deleteLog(id)
      logs.value = logs.value.filter((l) => l.id !== id)
      $q.notify({ type: 'positive', message: 'Log dihapus.' })
      return { success: true }
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: error.response?.data?.error || 'Gagal menghapus log.',
      })
      return { success: false }
    }
  }

  // ── Filter (presentation)
  const filteredLogs = computed(() => {
    const q = String(searchQuery.value || '')
      .trim()
      .toLowerCase()
    const dir = directionFilter.value
    const stat = statusFilter.value
    const list = Array.isArray(logs.value) ? logs.value : []

    return list.filter((log) => {
      if (dir !== 'ALL' && log.direction !== dir) return false
      if (stat !== 'ALL' && log.status !== stat) return false
      if (!q) return true

      const school = String(log.school_name || '').toLowerCase()
      const phone = String(log.contact_phone || '').toLowerCase()
      const msg = String(log.message || '').toLowerCase()
      return school.includes(q) || phone.includes(q) || msg.includes(q)
    })
  })

  // ── Stats (presentation summary)
  const stats = computed(() => {
    const list = Array.isArray(logs.value) ? logs.value : []
    return {
      total: list.length,
      pending: list.filter((l) => l.status === 'PENDING').length,
      replied: list.filter((l) => l.status === 'REPLIED').length,
      resolved: list.filter((l) => l.status === 'RESOLVED').length,
      inbound: list.filter((l) => l.direction === 'INBOUND').length,
      outbound: list.filter((l) => l.direction === 'OUTBOUND').length,
    }
  })
  /**
   * Lookup phone tenant by school_name.
   * Dipakai UI untuk auto-fill saat sekolah dipilih.
   * @param {string} schoolName
   * @returns {string} phone atau '' kalau tidak ditemukan
   */
  const getSchoolPhoneByName = (schoolName, schoolList = []) => {
    if (!schoolName) return ''
    const found = (Array.isArray(schoolList) ? schoolList : []).find(
      (s) => String(s.school_name || '').toLowerCase() === String(schoolName).toLowerCase(),
    )
    return found?.contact_phone || ''
  }
  // ── Lifecycle
  onMounted(() => {
    fetchLogs()
  })

  return {
    // state
    logs,
    loading,
    submitting,
    errorState,
    searchQuery,
    directionFilter,
    statusFilter,
    // computed
    filteredLogs,
    stats,
    // actions
    fetchLogs,
    createLog,
    updateLog,
    deleteLog,
    getSchoolPhoneByName,
  }
}
