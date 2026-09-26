// src/composables/super/useSuperDashboard.js
//
// Composable: UI orchestration untuk SuperDashboard.
// Responsibility:
//   - state: stats, systemLogs, isRefreshing, errorState
//   - fetch orchestration (Promise.all)
//   - polling lifecycle (onMounted / onBeforeUnmount)
//   - presentation transform (cpuPercent, ramPercentage, ramFree, num)
//   - error handling terklasifikasi (network / 404 / server / contract)
//
// BUKAN responsibility:
//   - business rule / domain rule
//   - HTTP detail (didelegasikan ke SuperDashboardService)
//
// Error behavior (per keputusan Fase 1c):
//   - JANGAN reset data saat error — data lama tetap valid
//   - JANGAN samarkan backend problem sebagai dashboard kosong
//   - Bedakan 4 kondisi error lewat errorState

import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { SuperDashboardService } from '@/services/super/SuperDashboardService'

const DEFAULT_STATS = {
  total_schools: 0,
  active_exams: 0,
  total_participants_online: 0,
  vps_cpu_estimate: 0,
  vps_ram_used_mb: 0,
  vps_ram_total_mb: 2048,
  active_tunnels: 0,
}

const POLL_INTERVAL_MS = 20000

export function useSuperDashboard() {
  // ── State
  const stats = ref({ ...DEFAULT_STATS })
  const systemLogs = ref([])
  const isRefreshing = ref(false)
  // null | 'endpoint_not_ready' | 'network_error' | 'server_error' | 'contract_mismatch'
  const errorState = ref(null)

  let pollingTimer = null

  // ── Presentation helpers
  const num = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }

  const cpuPercent = computed(() => Math.max(0, Math.min(100, num(stats.value.vps_cpu_estimate))))
  const cpuCritical = computed(() => cpuPercent.value > 80)

  const ramPercentage = computed(() => {
    const total = num(stats.value.vps_ram_total_mb)
    if (total <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((num(stats.value.vps_ram_used_mb) / total) * 100)))
  })

  const ramFree = computed(() =>
    Math.max(0, num(stats.value.vps_ram_total_mb) - num(stats.value.vps_ram_used_mb)),
  )

  // ── Fetch orchestration
  const loadDashboardData = async () => {
    console.log('[T4-poll] tick', new Date().toLocaleTimeString())
    try {
      const [statsRes, logsRes] = await Promise.all([
        SuperDashboardService.getStats(),
        SuperDashboardService.getLogs(),
      ])

      // Contract validation eksplisit — jangan asumsi shape
      const statsData = statsRes?.data
      const logsData = logsRes?.data

      const statsOk = statsData && typeof statsData === 'object' && !Array.isArray(statsData)
      const logsOk = Array.isArray(logsData)

      if (!statsOk || !logsOk) {
        errorState.value = 'contract_mismatch'
        console.warn('[useSuperDashboard] contract mismatch', {
          statsType: Array.isArray(statsData) ? 'array' : typeof statsData,
          logsType: Array.isArray(logsData) ? 'array' : typeof logsData,
        })
        return
      }

      // Apply — merge DEFAULT supaya field partial tidak NaN
      stats.value = { ...DEFAULT_STATS, ...statsData }
      systemLogs.value = logsData
      errorState.value = null
    } catch (error) {
      const status = error?.response?.status

      // 404 — endpoint belum tersedia (Phase 7+). Data lama TETAP.
      if (status === 404) {
        errorState.value = 'endpoint_not_ready'
        return
      }

      // Network error — koneksi putus. Data lama TETAP.
      if (!error.response) {
        errorState.value = 'network_error'
        return
      }

      // Server error (5xx / 4xx lain). Data lama TETAP.
      errorState.value = 'server_error'
      console.warn('[useSuperDashboard] server error:', status, error.message)
    }
  }

  const manualRefresh = async () => {
    isRefreshing.value = true
    try {
      await loadDashboardData()
    } finally {
      isRefreshing.value = false
    }
  }

  // ── Lifecycle
  onMounted(() => {
    loadDashboardData()
    pollingTimer = setInterval(loadDashboardData, POLL_INTERVAL_MS)
  })

  onBeforeUnmount(() => {
    if (pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
  })

  return {
    // state
    stats,
    systemLogs,
    isRefreshing,
    errorState,
    // computed
    cpuPercent,
    cpuCritical,
    ramPercentage,
    ramFree,
    // actions
    manualRefresh,
    // util
    num,
  }
}
