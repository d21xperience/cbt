// src/composables/admin/useParticipants.js
//
// Composable: UI orchestration untuk modul Data Peserta.
// Responsibility:
//   - state: participants, exams, filter, import flow
//   - fetch orchestration
//   - filter computed (presentation)
//   - CRUD + import workflow
//   - error handling terklasifikasi
//
// BUKAN responsibility:
//   - business rule (mis. "SIAKAD tidak boleh dihapus" — itu domain, tapi
//     kita enforce di UI-side untuk UX; backend verify juga)

import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { ParticipantService } from '@/services/admin/ParticipantService'

export function useParticipants() {
  const $q = useQuasar()

  // ── List state
  const participants = ref([])
  const exams = ref([])
  const loading = ref(false)
  const errorState = ref(null)
  // null | 'endpoint_not_ready' | 'network_error' | 'server_error' | 'contract_mismatch'

  // ── Filter state (UI concern)
  const filterExamId = ref(null)
  const filterSource = ref(null)
  const filterSearch = ref('')

  // ── Import state
  const importPreview = ref([])
  const importErrors = ref([])
  const isImporting = ref(false)
  const importProgress = ref(0)

  // ── Computed
  const filteredParticipants = computed(() => {
    const list = Array.isArray(participants.value) ? participants.value : []
    const q = String(filterSearch.value || '')
      .trim()
      .toLowerCase()

    return list.filter((p) => {
      if (filterExamId.value && p.exam_id !== filterExamId.value) return false
      if (filterSource.value && p.source !== filterSource.value) return false
      if (!q) return true
      const name = String(p.name || '').toLowerCase()
      const nisn = String(p.nisn || '').toLowerCase()
      const pid = String(p.participant_id || '').toLowerCase()
      return name.includes(q) || nisn.includes(q) || pid.includes(q)
    })
  })

  const validCount = computed(() => importPreview.value.filter((p) => !p._error).length)

  const examOptions = computed(() =>
    exams.value.map((e) => ({ label: e.name || e.exam_name || e.subject, value: e.id })),
  )

  const sourceOptions = [
    { label: 'SIAKAD (Dapodik)', value: 'SIAKAD' },
    { label: 'Eksternal', value: 'EXTERNAL' },
  ]

  // ── Loaders
  const fetchParticipants = async () => {
    loading.value = true
    try {
      const res = await ParticipantService.getParticipants()
      const data = res?.data?.data
      if (!Array.isArray(data) && data !== null && data !== undefined) {
        errorState.value = 'contract_mismatch'
        return
      }
      participants.value = Array.isArray(data) ? data : []
      errorState.value = null
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) errorState.value = 'endpoint_not_ready'
      else if (!err.response) errorState.value = 'network_error'
      else errorState.value = 'server_error'
      participants.value = []
      console.warn('[useParticipants] fetch failed:', err?.message)
    } finally {
      loading.value = false
    }
  }

  const fetchExams = async () => {
    try {
      const res = await ParticipantService.getExams()
      const data = res?.data?.data || res?.data
      exams.value = Array.isArray(data) ? data : []
    } catch (err) {
      if (err?.response?.status !== 404) {
        console.warn('[useParticipants] fetch exams failed:', err?.message)
      }
      exams.value = []
    }
  }

  // ── Delete
  const deleteParticipant = async (row) => {
    if (!row?.id) return false
    try {
      await ParticipantService.deleteParticipant(row.id)
      participants.value = participants.value.filter((p) => p.id !== row.id)
      $q.notify({ type: 'positive', message: 'Peserta berhasil dihapus.' })
      return true
    } catch (err) {
      $q.notify({
        type: 'negative',
        message:
          err?.response?.data?.message || err?.response?.data?.error || 'Gagal menghapus peserta.',
      })
      return false
    }
  }

  // ── Import flow
  const resetImport = () => {
    importPreview.value = []
    importErrors.value = []
    importProgress.value = 0
  }

  /**
   * Parse CSV — return preview rows. Tidak simpan.
   */
  const parseImport = async (file, meta = {}) => {
    if (!file) {
      $q.notify({ type: 'warning', message: 'Pilih file CSV terlebih dahulu.' })
      return { success: false }
    }
    isImporting.value = true
    importProgress.value = 0
    resetImport()

    try {
      const res = await ParticipantService.parseImport(file, meta)
      const payload = res?.data || {}
      importPreview.value = Array.isArray(payload.data) ? payload.data : []
      importErrors.value = Array.isArray(payload.errors) ? payload.errors : []
      return {
        success: true,
        total: importPreview.value.length,
        valid: validCount.value,
        invalid: importPreview.value.length - validCount.value,
      }
    } catch (err) {
      importErrors.value = [{ row: 0, message: err?.response?.data?.error || 'Gagal parse file.' }]
      $q.notify({
        type: 'negative',
        message: err?.response?.data?.error || 'Gagal parse file CSV.',
      })
      return { success: false }
    } finally {
      isImporting.value = false
    }
  }

  /**
   * Commit import — simpan ke DB.
   */
  const confirmImport = async (meta = {}) => {
    if (validCount.value === 0) {
      $q.notify({ type: 'warning', message: 'Tidak ada peserta valid untuk diimport.' })
      return { success: false }
    }

    isImporting.value = true
    try {
      const res = await ParticipantService.confirmImport(meta)
      const count = res?.data?.imported_count ?? res?.data?.data?.imported_count ?? 0
      $q.notify({
        type: 'positive',
        message: `${count} peserta berhasil diimport.`,
        timeout: 3000,
      })
      await fetchParticipants()
      resetImport()
      return { success: true, imported_count: count }
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: err?.response?.data?.error || 'Gagal import peserta.',
      })
      return { success: false }
    } finally {
      isImporting.value = false
    }
  }

  // ── Lifecycle
  onMounted(() => {
    fetchParticipants()
    fetchExams()
  })

  return {
    // state
    participants,
    exams,
    loading,
    errorState,
    isImporting,
    importProgress,
    // filter (UI)
    filterExamId,
    filterSource,
    filterSearch,
    filteredParticipants,
    examOptions,
    sourceOptions,
    // import
    importPreview,
    importErrors,
    validCount,
    // actions
    fetchParticipants,
    fetchExams,
    deleteParticipant,
    parseImport,
    confirmImport,
    resetImport,
  }
}
