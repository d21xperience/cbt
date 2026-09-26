// src/composables/super/useTelemetryLogs.js
//
// Composable: UI orchestration untuk halaman Log Telemetri.
// Responsibility:
//   - state: logs, loading, errorState, searchQuery, statusFilter
//   - fetch orchestration
//   - filter computed (presentation concern)
//   - error handling terklasifikasi (network / 404 / server / contract)
//
// BUKAN responsibility:
//   - business rule / domain rule
//   - HTTP detail (didelegasikan ke TelemetryService)

import { ref, computed, onMounted } from 'vue'
import { TelemetryService } from '@/services/super/TelemetryService'

export function useTelemetryLogs() {
  // ── State
  const logs = ref([])
  const loading = ref(false)
  // null | 'endpoint_not_ready' | 'network_error' | 'server_error' | 'contract_mismatch'
  const errorState = ref(null)

  const searchQuery = ref('')
  const statusFilter = ref('ALL')

  // ── Fetch orchestration
  const fetchLogs = async () => {
    loading.value = true
    try {
      const res = await TelemetryService.getLogs()
      const data = res?.data

      // Contract validation eksplisit — harus array
      if (!Array.isArray(data)) {
        errorState.value = 'contract_mismatch'
        console.warn('[useTelemetryLogs] contract mismatch', {
          type: Array.isArray(data) ? 'array' : typeof data,
        })
        return
      }

      logs.value = data
      errorState.value = null
    } catch (error) {
      const status = error?.response?.status

      // 404 — endpoint belum tersedia (VER-011 pending)
      // Data lama TETAP — jangan reset
      if (status === 404) {
        errorState.value = 'endpoint_not_ready'
        return
      }

      // Network error
      if (!error.response) {
        errorState.value = 'network_error'
        return
      }

      // Server error
      errorState.value = 'server_error'
      console.warn('[useTelemetryLogs] server error:', status, error.message)
    } finally {
      loading.value = false
    }
  }

  // ── Filter (presentation concern — bukan business rule)
  const filteredLogs = computed(() => {
    const q = String(searchQuery.value || '')
      .trim()
      .toLowerCase()
    const status = statusFilter.value
    const list = Array.isArray(logs.value) ? logs.value : []

    return list.filter((log) => {
      const matchesStatus = status === 'ALL' || log.status === status
      if (!matchesStatus) return false
      if (!q) return true

      const name = String(log.school_name || '').toLowerCase()
      const msg = String(log.message || '').toLowerCase()
      return name.includes(q) || msg.includes(q)
    })
  })

  // ── Lifecycle
  onMounted(() => {
    fetchLogs()
  })

  return {
    // state
    logs,
    loading,
    errorState,
    searchQuery,
    statusFilter,
    // computed
    filteredLogs,
    // actions
    fetchLogs,
  }
}
