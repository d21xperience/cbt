// src/composables/admin/useMakeupExams.js
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { MakeupService } from '@/services/admin/MakeupService'
import { ClassService } from '@/services/admin/ClassService'
import { SubjectService } from '@/services/admin/SubjectService'

export function useMakeupExams() {
  const $q = useQuasar()

  // ── List
  const items = ref([])
  const classes = ref([])
  const subjects = ref([])
  const loading = ref(false)
  const errorState = ref(null)

  // ── Filter
  const searchQuery = ref('')
  const filterStatus = ref(null)
  const filterClass = ref(null)
  const filterSubject = ref(null)

  // ── Options
  const statusOptions = [
    { label: 'Belum', value: 'NOT_STARTED', color: 'grey-6' },
    { label: 'Melaksanakan', value: 'IN_PROGRESS', color: 'orange' },
    { label: 'Selesai', value: 'COMPLETED', color: 'positive' },
  ]

  const classOptions = computed(() => classes.value.map((c) => ({ label: c.nama, value: c.id })))
  const subjectOptions = computed(() =>
    subjects.value.map((s) => ({ label: `${s.kode} — ${s.nama}`, value: s.id })),
  )

  // ── Stats
  const stats = computed(() => {
    const list = Array.isArray(items.value) ? items.value : []
    return {
      total: list.length,
      notStarted: list.filter((i) => i.status === 'NOT_STARTED').length,
      inProgress: list.filter((i) => i.status === 'IN_PROGRESS').length,
      completed: list.filter((i) => i.status === 'COMPLETED').length,
    }
  })

  // ── Filtered
  const filteredItems = computed(() => {
    const list = Array.isArray(items.value) ? items.value : []
    const q = String(searchQuery.value || '')
      .trim()
      .toLowerCase()

    return list.filter((i) => {
      if (filterStatus.value && i.status !== filterStatus.value) return false
      if (filterClass.value && i.class_id !== filterClass.value) return false
      if (filterSubject.value && i.subject_id !== filterSubject.value) return false
      if (!q) return true
      return (
        String(i.student_name || '')
          .toLowerCase()
          .includes(q) ||
        String(i.nisn || '')
          .toLowerCase()
          .includes(q)
      )
    })
  })

  // ── Loaders
  const loadItems = async () => {
    loading.value = true
    try {
      const res = await MakeupService.list()
      const data = res?.data?.data ?? res?.data
      if (!Array.isArray(data)) {
        errorState.value = 'contract_mismatch'
        return
      }
      items.value = data
      errorState.value = null
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) errorState.value = 'endpoint_not_ready'
      else if (!err.response) errorState.value = 'network_error'
      else errorState.value = 'server_error'
      items.value = []
      console.warn('[useMakeupExams] loadItems failed:', status, err?.message)
    } finally {
      loading.value = false
    }
  }

  const loadRefs = async () => {
    try {
      const [clsRes, subRes] = await Promise.all([ClassService.list(), SubjectService.list()])
      classes.value = Array.isArray(clsRes?.data?.data) ? clsRes.data.data : []
      subjects.value = Array.isArray(subRes?.data?.data) ? subRes.data.data : []
    } catch (err) {
      console.warn('[useMakeupExams] loadRefs failed:', err?.message)
    }
  }

  // ── Actions
  const startMakeup = (row) => {
    $q.dialog({
      title: 'Mulai Ujian Susulan',
      message: `Mulai sesi susulan untuk <b>${row.student_name}</b> — ${row.subject_nama}?`,
      html: true,
      cancel: { label: 'Batal', flat: true },
      ok: { label: 'Mulai', color: 'primary', flat: true },
      persistent: true,
    }).onOk(() => {
      $q.notify({
        type: 'info',
        icon: 'construction',
        message: 'Fitur mulai susulan akan tersedia di Fase 2b.',
      })
    })
  }

  onMounted(() => {
    loadItems()
    loadRefs()
  })

  return {
    items,
    loading,
    errorState,
    searchQuery,
    filterStatus,
    filterClass,
    filterSubject,
    filteredItems,
    statusOptions,
    classOptions,
    subjectOptions,
    stats,
    loadItems,
    startMakeup,
  }
}
