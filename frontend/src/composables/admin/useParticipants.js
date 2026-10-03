// src/composables/admin/useParticipants.js
// UI orchestration untuk modul Data Peserta (derive dari Siswa).

import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { ParticipantService } from '@/services/admin/ParticipantService'

export function useParticipants() {
  const $q = useQuasar()

  // ── List state
  const participants = ref([])
  const loading = ref(false)
  const errorState = ref(null)

  // ── Filter
  const filterSource = ref(null)
  const filterSearch = ref('')

  // ── Computed
  const filteredParticipants = computed(() => {
    const list = Array.isArray(participants.value) ? participants.value : []
    const q = String(filterSearch.value || '')
      .trim()
      .toLowerCase()

    return list.filter((p) => {
      if (filterSource.value && p.source !== filterSource.value) return false
      if (!q) return true
      return (
        String(p.nama || '')
          .toLowerCase()
          .includes(q) ||
        String(p.nisn || '')
          .toLowerCase()
          .includes(q) ||
        String(p.nis || '')
          .toLowerCase()
          .includes(q)
      )
    })
  })

  // ── Fetch
  const fetchParticipants = async () => {
    loading.value = true
    try {
      const res = await ParticipantService.getParticipants()
      const data = res?.data?.data
      if (!Array.isArray(data)) {
        errorState.value = 'contract_mismatch'
        return
      }
      participants.value = data
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

  // ── Reset password
  const resetPassword = async (row) => {
    if (!row?.id) return null
    try {
      const res = await ParticipantService.resetPassword(row.id)
      const newPwd = res?.data?.data?.exam_password
      // Update local state
      const idx = participants.value.findIndex((p) => p.id === row.id)
      if (idx !== -1 && newPwd) {
        participants.value[idx] = { ...participants.value[idx], exam_password: newPwd }
      }
      return newPwd
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: err?.response?.data?.message || 'Gagal reset password.',
      })
      return null
    }
  }

  onMounted(fetchParticipants)

  return {
    participants,
    loading,
    errorState,
    filterSearch,
    filteredParticipants,
    fetchParticipants,
    resetPassword,
  }
}
