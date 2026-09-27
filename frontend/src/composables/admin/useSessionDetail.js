// src/composables/admin/useSessionDetail.js
import { ref, computed, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { SessionService } from '@/services/admin/SessionService'

export function useSessionDetail() {
  const $q = useQuasar()

  const loading = ref(false)
  const refreshing = ref(false)
  const session = ref(null)
  const participants = ref([])
  const violations = ref([])
  const activities = ref([])

  const autoRefresh = ref(false)
  const refreshIntervalSec = ref(30)
  const lastRefreshAt = ref(null)
  let timer = null

  const stats = computed(() => {
    const p = participants.value
    return {
      total: p.length,
      belum_mulai: p.filter((x) => x.status === 'BELUM_MULAI').length,
      aktif: p.filter((x) => x.status === 'AKTIF').length,
      selesai: p.filter((x) => x.status === 'SELESAI').length,
      terblokir: p.filter((x) => x.status === 'TERBLOKIR').length,
      violations: violations.value.length,
    }
  })

  const loadAll = async (sessionId, isRefresh = false) => {
    if (isRefresh) refreshing.value = true
    else loading.value = true
    try {
      const [sRes, pRes, vRes, aRes] = await Promise.allSettled([
        SessionService.get(sessionId),
        SessionService.getParticipants(sessionId),
        SessionService.getViolations(sessionId),
        SessionService.getActivities(sessionId),
      ])
      if (sRes.status === 'fulfilled') session.value = sRes.value.data?.data || null
      if (pRes.status === 'fulfilled') participants.value = pRes.value.data?.data || []
      if (vRes.status === 'fulfilled') violations.value = vRes.value.data?.data || []
      if (aRes.status === 'fulfilled') activities.value = aRes.value.data?.data || []
      lastRefreshAt.value = new Date().toISOString()
    } catch (e) {
      console.error('[SessionDetail] load failed', e)
      $q.notify({ type: 'negative', message: 'Gagal memuat detail sesi' })
    } finally {
      loading.value = false
      refreshing.value = false
    }
  }

  // ── Aksi (reuse dari C1b)
  const doAction = async (fn, successMsg) => {
    try {
      await fn()
      $q.notify({ type: 'positive', message: successMsg })
      await loadAll(session.value?.id, true)
      return true
    } catch (e) {
      $q.notify({
        type: 'negative',
        message: e?.response?.data?.message || 'Aksi gagal',
      })
      return false
    }
  }

  const actionStart = () => doAction(() => SessionService.start(session.value.id), 'Sesi dimulai')
  const actionPause = () => doAction(() => SessionService.pause(session.value.id), 'Sesi ditunda')
  const actionResume = () =>
    doAction(() => SessionService.resume(session.value.id), 'Sesi dilanjutkan')
  const actionEnd = () => doAction(() => SessionService.end(session.value.id), 'Sesi diakhiri')
  const actionExtend = (minutes) =>
    doAction(() => SessionService.extend(session.value.id, minutes), `Waktu +${minutes} menit`)
  const actionForceSubmit = () =>
    doAction(() => SessionService.forceSubmit(session.value.id), 'Force submit semua')
  const actionRegenToken = () =>
    doAction(() => SessionService.regenerateToken(session.value.id), 'Token di-regenerate')

  // ── Auto refresh
  const startAutoRefresh = () => {
    stopAutoRefresh()
    if (!autoRefresh.value) return
    timer = setInterval(() => {
      if (session.value?.id) loadAll(session.value.id, true)
    }, refreshIntervalSec.value * 1000)
  }

  const stopAutoRefresh = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  const toggleAutoRefresh = (val) => {
    autoRefresh.value = val
    if (val) startAutoRefresh()
    else stopAutoRefresh()
  }

  onUnmounted(stopAutoRefresh)

  return {
    loading,
    refreshing,
    session,
    participants,
    violations,
    activities,
    stats,
    autoRefresh,
    refreshIntervalSec,
    lastRefreshAt,
    loadAll,
    toggleAutoRefresh,
    stopAutoRefresh,
    actionStart,
    actionPause,
    actionResume,
    actionEnd,
    actionExtend,
    actionForceSubmit,
    actionRegenToken,
  }
}
