// src/composables/admin/useSessionsMonitoring.js
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { SessionService } from '@/services/admin/SessionService'
import { ExamTypeService } from '@/services/admin/ExamTypeService'

export function useSessionsMonitoring() {
  const $q = useQuasar()

  const loading = ref(false)
  const syncing = ref(false)
  const sessions = ref([])
  const examTypes = ref([])

  const filters = ref({
    search: '',
    tanggal: '',
    ruang: null,
    status: null,
    jenis_ujian_id: null,
  })

  const statusOptions = [
    { label: 'Terjadwal', value: 'SCHEDULED' },
    { label: 'Berlangsung', value: 'ACTIVE' },
    { label: 'Ditunda', value: 'PAUSED' },
    { label: 'Selesai', value: 'COMPLETED' },
  ]

  const examTypeOptions = computed(() =>
    examTypes.value.map((t) => ({ label: `${t.kode} — ${t.nama}`, value: t.id })),
  )

  const ruangOptions = computed(() => {
    const set = new Set()
    sessions.value.forEach((s) => {
      if (s.ruang_id && s.ruang_nama) set.add(`${s.ruang_id}::${s.ruang_nama}`)
    })
    return Array.from(set).map((pair) => {
      const [value, label] = pair.split('::')
      return { label, value }
    })
  })

  const stats = computed(() => ({
    total: sessions.value.length,
    scheduled: sessions.value.filter((s) => s.status === 'SCHEDULED').length,
    active: sessions.value.filter((s) => s.status === 'ACTIVE').length,
    completed: sessions.value.filter((s) => s.status === 'COMPLETED').length,
  }))

  const loadRefs = async () => {
    try {
      const res = await ExamTypeService.list()
      examTypes.value = res.data?.data || res.data || []
    } catch (e) {
      console.warn('[Sessions] loadExamTypes failed', e)
    }
  }

  const reload = async () => {
    loading.value = true
    try {
      const res = await SessionService.list({
        search: filters.value.search || undefined,
        tanggal: filters.value.tanggal || undefined,
        ruang: filters.value.ruang || undefined,
        status: filters.value.status || undefined,
        jenis_ujian_id: filters.value.jenis_ujian_id || undefined,
      })
      sessions.value = res.data?.data || []
    } catch (e) {
      console.error('[Sessions] reload failed', e)
      sessions.value = []
    } finally {
      loading.value = false
    }
  }

  const syncNow = async () => {
    syncing.value = true
    try {
      const res = await SessionService.sync()
      const created = res.data?.created || 0
      $q.notify({
        type: created > 0 ? 'positive' : 'info',
        message:
          created > 0
            ? `${created} sesi baru ter-generate dari jadwal`
            : 'Semua jadwal sudah punya sesi. Tidak ada yang baru.',
      })
      await reload()
    } catch (e) {
      $q.notify({ type: 'negative', message: `Gagal sync sesi \n ${e}` })
    } finally {
      syncing.value = false
    }
  }
  // ── Aksi Control
  const actionStart = async (row) => {
    try {
      await SessionService.start(row.id)
      $q.notify({ type: 'positive', message: 'Sesi dimulai' })
      await reload()
      return true
    } catch (e) {
      $q.notify({
        type: 'negative',
        message: e?.response?.data?.message || 'Gagal memulai sesi',
      })
      return false
    }
  }

  const actionPause = async (row) => {
    try {
      await SessionService.pause(row.id)
      $q.notify({ type: 'warning', message: 'Sesi ditunda' })
      await reload()
      return true
    } catch (e) {
      $q.notify({
        type: 'negative',
        message: e?.response?.data?.message || 'Gagal menunda sesi',
      })
      return false
    }
  }

  const actionResume = async (row) => {
    try {
      await SessionService.resume(row.id)
      $q.notify({ type: 'positive', message: 'Sesi dilanjutkan' })
      await reload()
      return true
    } catch (e) {
      $q.notify({
        type: 'negative',
        message: e?.response?.data?.message || 'Gagal melanjutkan sesi',
      })
      return false
    }
  }

  const actionEnd = async (row) => {
    try {
      await SessionService.end(row.id)
      $q.notify({ type: 'positive', message: 'Sesi selesai' })
      await reload()
      return true
    } catch (e) {
      $q.notify({
        type: 'negative',
        message: e?.response?.data?.message || 'Gagal mengakhiri sesi',
      })
      return false
    }
  }

  const actionExtend = async (row, minutes) => {
    try {
      await SessionService.extend(row.id, minutes)
      $q.notify({ type: 'positive', message: `Waktu ditambah ${minutes} menit` })
      await reload()
      return true
    } catch (e) {
      $q.notify({
        type: 'negative',
        message: e?.response?.data?.message || 'Gagal extend waktu',
      })
      return false
    }
  }

  const actionForceSubmit = async (row) => {
    try {
      const res = await SessionService.forceSubmit(row.id)
      $q.notify({
        type: 'positive',
        message: res?.data?.message || 'Force submit berhasil',
      })
      await reload()
      return true
    } catch (e) {
      $q.notify({
        type: 'negative',
        message: e?.response?.data?.message || 'Gagal force submit',
      })
      return false
    }
  }

  const actionRegenToken = async (row) => {
    try {
      const res = await SessionService.regenerateToken(row.id)
      const newToken = res?.data?.data?.token
      $q.notify({ type: 'positive', message: `Token baru: ${newToken}` })
      await reload()
      return true
    } catch (e) {
      $q.notify({
        type: 'negative',
        message: e?.response?.data?.message || 'Gagal regenerate token',
      })
      return false
    }
  }
  const resetFilters = () => {
    filters.value = {
      search: '',
      tanggal: '',
      ruang: null,
      status: null,
      jenis_ujian_id: null,
    }
    reload()
  }

  return {
    loading,
    syncing,
    sessions,
    filters,
    statusOptions,
    examTypeOptions,
    ruangOptions,
    stats,
    loadRefs,
    reload,
    syncNow,
    resetFilters,
    actionStart,
    actionPause,
    actionResume,
    actionEnd,
    actionExtend,
    actionForceSubmit,
    actionRegenToken,
  }
}
