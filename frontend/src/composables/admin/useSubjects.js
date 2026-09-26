// src/composables/admin/useSubjects.js
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { SubjectService } from '@/services/admin/SubjectService'
import { ProgramKeahlianService } from '@/services/admin/ProgramKeahlianService'
import { SchoolProfileService } from '@/services/admin/SchoolProfileService'
import { getGradeOptionsForJenjang } from '@/domain/school/jenjang'

const EMPTY_FORM = {
  kode: '',
  nama: '',
  nama_singkat: '',
  kelompok: 'WAJIB',
  tingkat: '',
  jurusan_id: null,
}

export function useSubjects() {
  const $q = useQuasar()

  // ── List
  const subjects = ref([])
  const programs = ref([])
  const schoolJenjang = ref(null)
  const programDurationYears = ref(3)
  const loading = ref(false)
  const loadingContext = ref(false)
  const errorState = ref(null)

  // ── Filter
  const searchQuery = ref('')
  const filterKelompok = ref(null)
  const filterTingkat = ref(null)

  // ── Dialog CRUD
  const dialogOpen = ref(false)
  const isEditing = ref(false)
  const editingId = ref(null)
  const initialForm = ref({ ...EMPTY_FORM })
  const submitting = ref(false)

  // ── Import
  const importDialogOpen = ref(false)
  const importStep = ref(1)
  const importPreview = ref([])
  const importErrors = ref([])
  const importing = ref(false)
  const downloadingTemplate = ref(false)

  // ── Options
  const kelompokOptions = [
    { label: 'Wajib', value: 'WAJIB' },
    { label: 'Pilihan', value: 'PILIHAN' },
    { label: 'Muatan Lokal', value: 'MULOK' },
    { label: 'Kejuruan', value: 'KEJURUAN' },
  ]

  const tingkatOptions = computed(() =>
    getGradeOptionsForJenjang(schoolJenjang.value, programDurationYears.value),
  )

  const jurusanOptions = computed(() =>
    programs.value.map((p) => ({
      label: p.nama || p.kode,
      value: p.id,
    })),
  )

  const isVocational = computed(() => {
    const j = String(schoolJenjang.value || '').toUpperCase()
    return j === 'SMK' || j === 'MAK'
  })

  // ── Computed (list)
  const filteredSubjects = computed(() => {
    const list = Array.isArray(subjects.value) ? subjects.value : []
    const q = String(searchQuery.value || '')
      .trim()
      .toLowerCase()

    return list.filter((s) => {
      if (filterKelompok.value && s.kelompok !== filterKelompok.value) return false
      if (filterTingkat.value && s.tingkat !== filterTingkat.value) return false
      if (!q) return true
      return (
        String(s.kode || '')
          .toLowerCase()
          .includes(q) ||
        String(s.nama || '')
          .toLowerCase()
          .includes(q) ||
        String(s.nama_singkat || '')
          .toLowerCase()
          .includes(q)
      )
    })
  })

  const importValidCount = computed(() => importPreview.value.filter((p) => !p._error).length)

  // ── Loaders
  const loadSubjects = async () => {
    loading.value = true
    try {
      const res = await SubjectService.list()
      const data = res?.data?.data ?? res?.data
      if (!Array.isArray(data)) {
        errorState.value = 'contract_mismatch'
        return
      }
      subjects.value = data
      errorState.value = null
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) errorState.value = 'endpoint_not_ready'
      else if (!err.response) errorState.value = 'network_error'
      else errorState.value = 'server_error'
      subjects.value = []
      console.warn('[useSubjects] loadSubjects failed:', status, err?.message)
    } finally {
      loading.value = false
    }
  }

  const loadContext = async () => {
    loadingContext.value = true
    try {
      const [progRes, schoolRes] = await Promise.all([
        ProgramKeahlianService.getAssignedPrograms(),
        SchoolProfileService.getProfile().catch(() => null),
      ])
      programs.value = Array.isArray(progRes?.data?.data) ? progRes.data.data : []
      const school = schoolRes?.data?.data ?? schoolRes?.data ?? {}
      schoolJenjang.value = school.jenjang || null
      programDurationYears.value = Number(school.program_duration_years) || 3
    } catch (err) {
      console.warn('[useSubjects] loadContext failed:', err?.message)
    } finally {
      loadingContext.value = false
    }
  }

  // ── Dialog
  const openCreateDialog = async () => {
    // Pastikan context (programs + jenjang) sudah di-load sebelum buka form
    if (programs.value.length === 0 && !schoolJenjang.value) {
      await loadContext()
    }

    isEditing.value = false
    editingId.value = null
    const defaultKelompok = isVocational.value ? 'KEJURUAN' : 'WAJIB'
    initialForm.value = {
      ...EMPTY_FORM,
      kelompok: defaultKelompok,
      tingkat: tingkatOptions.value[0]?.value || '',
    }
    dialogOpen.value = true
  }

  const openEditDialog = async (row) => {
    if (programs.value.length === 0 && !schoolJenjang.value) {
      await loadContext()
    }
    isEditing.value = true
    editingId.value = row.id
    initialForm.value = {
      kode: row.kode || '',
      nama: row.nama || '',
      nama_singkat: row.nama_singkat || '',
      kelompok: row.kelompok || 'WAJIB',
      tingkat: row.tingkat || '',
      jurusan_id: row.jurusan_id || null,
    }
    dialogOpen.value = true
  }

  const closeDialog = () => {
    dialogOpen.value = false
    isEditing.value = false
    editingId.value = null
    initialForm.value = { ...EMPTY_FORM }
  }

  const submitForm = async (payload) => {
    if (!payload) return { success: false }
    submitting.value = true
    try {
      if (isEditing.value && editingId.value) {
        const res = await SubjectService.update(editingId.value, payload)
        const idx = subjects.value.findIndex((s) => s.id === editingId.value)
        if (idx !== -1) {
          subjects.value[idx] = { ...subjects.value[idx], ...(res?.data?.data || payload) }
        }
        $q.notify({ type: 'positive', message: 'Mata pelajaran diperbarui.' })
      } else {
        const res = await SubjectService.create(payload)
        const created = res?.data?.data
        if (created && typeof created === 'object') {
          subjects.value = [created, ...subjects.value]
        } else {
          await loadSubjects()
        }
        $q.notify({ type: 'positive', message: 'Mata pelajaran ditambahkan.' })
      }
      closeDialog()
      return { success: true }
    } catch (err) {
      $q.notify({
        type: 'negative',
        message:
          err?.response?.data?.message || err?.response?.data?.error || 'Gagal menyimpan data.',
      })
      return { success: false }
    } finally {
      submitting.value = false
    }
  }

  const deleteSubject = async (row) => {
    if (!row?.id) return false
    try {
      await SubjectService.remove(row.id)
      subjects.value = subjects.value.filter((s) => s.id !== row.id)
      $q.notify({ type: 'positive', message: 'Mata pelajaran dihapus.' })
      return true
    } catch (err) {
      const errCode = err?.response?.data?.error
      const msg =
        errCode === 'subject_in_use'
          ? 'Mata pelajaran tidak dapat dihapus karena masih dipakai.'
          : err?.response?.data?.message || 'Gagal menghapus data.'
      $q.notify({ type: 'negative', message: msg })
      return false
    }
  }

  // ── Import (pattern existing)
  const openImportDialog = () => {
    importDialogOpen.value = true
    importStep.value = 1
    importPreview.value = []
    importErrors.value = []
  }
  const closeImportDialog = () => {
    importDialogOpen.value = false
    importStep.value = 1
    importPreview.value = []
    importErrors.value = []
  }

  const downloadTemplate = async (format = 'csv') => {
    downloadingTemplate.value = true
    try {
      const res = await SubjectService.downloadTemplate(format)
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `template_mapel_${Date.now()}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      $q.notify({ type: 'positive', message: `Template ${format.toUpperCase()} di-download.` })
      return { success: true }
    } catch {
      $q.notify({ type: 'negative', message: 'Gagal download template.' })
      return { success: false }
    } finally {
      downloadingTemplate.value = false
    }
  }

  const parseImport = async (file) => {
    if (!file) {
      $q.notify({ type: 'warning', message: 'Pilih file CSV terlebih dahulu.' })
      return { success: false }
    }
    importing.value = true
    try {
      const res = await SubjectService.parseImport(file)
      const payload = res?.data || {}
      importPreview.value = Array.isArray(payload.data) ? payload.data : []
      importErrors.value = Array.isArray(payload.errors) ? payload.errors : []
      return { success: true }
    } catch (err) {
      $q.notify({ type: 'negative', message: err?.response?.data?.error || 'Gagal parse file.' })
      return { success: false }
    } finally {
      importing.value = false
    }
  }

  const confirmImport = async () => {
    const valid = importPreview.value.filter((p) => !p._error)
    if (valid.length === 0) {
      $q.notify({ type: 'warning', message: 'Tidak ada baris valid.' })
      return { success: false }
    }
    importing.value = true
    try {
      const res = await SubjectService.confirmImport(valid)
      const count = res?.data?.imported_count ?? valid.length
      $q.notify({ type: 'positive', message: `${count} mata pelajaran berhasil diimport.` })
      await loadSubjects()
      closeImportDialog()
      return { success: true }
    } catch (err) {
      $q.notify({ type: 'negative', message: err?.response?.data?.error || 'Gagal import.' })
      return { success: false }
    } finally {
      importing.value = false
    }
  }

  onMounted(() => {
    loadSubjects()
    loadContext()
  })

  return {
    subjects,
    programs,
    schoolJenjang,
    loading,
    errorState,
    // filter
    searchQuery,
    filterKelompok,
    filterTingkat,
    filteredSubjects,
    // options
    kelompokOptions,
    tingkatOptions,
    jurusanOptions,
    isVocational,
    // dialog CRUD
    dialogOpen,
    isEditing,
    initialForm,
    submitting,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    submitForm,
    deleteSubject,
    loadSubjects,
    // import
    importDialogOpen,
    importStep,
    importPreview,
    importErrors,
    importing,
    downloadingTemplate,
    importValidCount,
    openImportDialog,
    closeImportDialog,
    downloadTemplate,
    parseImport,
    confirmImport,
    loadingContext,
  }
}
