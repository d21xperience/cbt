// src/composables/admin/useSchoolProfile.js
//
// Composable: UI orchestration untuk Profil Sekolah.
// Responsibility:
//   - state: profile, isEditing, form, snapshot, saving, loading, error
//   - fetch + save
//   - dirty check
//   - error handling terklasifikasi
//
// BUKAN responsibility:
//   - business rule
//   - HTTP detail (delegasi ke SchoolProfileService)

import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { SchoolProfileService } from '@/services/admin/SchoolProfileService'

const EMPTY_PROFILE = {
  nama: '',
  jenjang: 'SMA',
  npsn: '',
  nss: '',
  alamat_jalan: '',
  alamat_desa: '',
  alamat_kecamatan: '',
  alamat_kabupaten: '',
  alamat_provinsi: '',
  alamat_kode_pos: '',
  telp: '',
  email: '',
  website: '',
  kepala_sekolah_nama: '',
  kepala_sekolah_nip: '',
  logo_url: '',
  kode_sekolah: '',
  program_duration_years: 3,
}

export function useSchoolProfile() {
  const $q = useQuasar()

  // ── State
  const loading = ref(false)
  const saving = ref(false)
  const isEditing = ref(false)
  const errorState = ref(null)
  // null | 'endpoint_not_ready' | 'network_error' | 'server_error' | 'contract_mismatch'

  const profile = ref({ ...EMPTY_PROFILE })
  const form = ref({ ...EMPTY_PROFILE })
  const originalSnapshot = ref(null)

  // ── Computed
  const isDirty = computed(() => {
    if (!originalSnapshot.value) return false
    return JSON.stringify(form.value) !== originalSnapshot.value
  })

  const canSubmit = computed(() => {
    if (!isDirty.value) return false
    // Validasi minimal
    if (!form.value.nama?.trim()) return false
    if (!form.value.jenjang) return false
    return true
  })

  // Derived: label jenjang untuk tampilan
  const jenjangLabel = computed(() => {
    const map = {
      SMP: 'SMP (Sekolah Menengah Pertama)',
      MTs: 'MTs (Madrasah Tsanawiyah)',
      SMA: 'SMA (Sekolah Menengah Atas)',
      MA: 'MA (Madrasah Aliyah)',
      SMK: 'SMK (Sekolah Menengah Kejuruan)',
      MAK: 'MAK (Madrasah Aliyah Kejuruan)',
    }
    return map[profile.value.jenjang] || profile.value.jenjang || '-'
  })

  // ── Fetch
  const loadProfile = async () => {
    loading.value = true
    try {
      const res = await SchoolProfileService.getProfile()
      const data = res?.data?.data ?? res?.data
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        errorState.value = 'contract_mismatch'
        return
      }
      profile.value = { ...EMPTY_PROFILE, ...data }
      form.value = { ...profile.value }
      originalSnapshot.value = JSON.stringify(form.value)
      errorState.value = null
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) errorState.value = 'endpoint_not_ready'
      else if (!err.response) errorState.value = 'network_error'
      else errorState.value = 'server_error'
      console.warn('[useSchoolProfile] loadProfile failed:', status, err?.message)
    } finally {
      loading.value = false
    }
  }

  // ── Edit / Cancel
  const startEditing = () => {
    form.value = { ...profile.value }
    originalSnapshot.value = JSON.stringify(profile.value)
    isEditing.value = true
  }

  const cancelEditing = () => {
    form.value = { ...profile.value }
    originalSnapshot.value = JSON.stringify(profile.value)
    isEditing.value = false
  }

  // ── Save
  const saveProfile = async () => {
    if (!canSubmit.value) return { success: false }
    saving.value = true
    try {
      const res = await SchoolProfileService.updateProfile(form.value)
      const data = res?.data?.data ?? form.value
      profile.value = { ...profile.value, ...data }
      form.value = { ...profile.value }
      originalSnapshot.value = JSON.stringify(form.value)
      isEditing.value = false
      $q.notify({
        type: 'positive',
        message: 'Profil sekolah berhasil disimpan.',
      })
      return { success: true }
    } catch (err) {
      const status = err?.response?.status
      $q.notify({
        type: 'negative',
        message:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          (status === 403
            ? 'Anda tidak memiliki izin untuk mengubah profil sekolah.'
            : 'Gagal menyimpan profil sekolah.'),
      })
      return { success: false }
    } finally {
      saving.value = false
    }
  }

  return {
    // state
    profile,
    form,
    loading,
    saving,
    isEditing,
    errorState,
    // computed
    isDirty,
    canSubmit,
    jenjangLabel,
    // actions
    loadProfile,
    startEditing,
    cancelEditing,
    saveProfile,
  }
}
