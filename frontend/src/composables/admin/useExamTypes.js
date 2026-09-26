// src/composables/admin/useExamTypes.js
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { ExamTypeService } from '@/services/admin/ExamTypeService'

const EMPTY_FORM = {
  kode: '',
  nama: '',
  deskripsi: '',
}

export function useExamTypes() {
  const $q = useQuasar()

  // ── List
  const examTypes = ref([])
  const loading = ref(false)
  const errorState = ref(null)

  // ── Filter
  const searchQuery = ref('')

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

  // ── Computed
  const filteredExamTypes = computed(() => {
    const list = Array.isArray(examTypes.value) ? examTypes.value : []
    const q = String(searchQuery.value || '')
      .trim()
      .toLowerCase()
    if (!q) return list
    return list.filter(
      (t) =>
        String(t.kode || '')
          .toLowerCase()
          .includes(q) ||
        String(t.nama || '')
          .toLowerCase()
          .includes(q),
    )
  })

  const importValidCount = computed(() => importPreview.value.filter((p) => !p._error).length)

  // ── Fetch
  const loadExamTypes = async () => {
    loading.value = true
    try {
      const res = await ExamTypeService.list()
      const data = res?.data?.data ?? res?.data
      if (!Array.isArray(data)) {
        errorState.value = 'contract_mismatch'
        return
      }
      examTypes.value = data
      errorState.value = null
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) errorState.value = 'endpoint_not_ready'
      else if (!err.response) errorState.value = 'network_error'
      else errorState.value = 'server_error'
      examTypes.value = []
      console.warn('[useExamTypes] loadExamTypes failed:', status, err?.message)
    } finally {
      loading.value = false
    }
  }

  // ── Dialog
  const openCreateDialog = () => {
    isEditing.value = false
    editingId.value = null
    initialForm.value = { ...EMPTY_FORM }
    dialogOpen.value = true
  }

  const openEditDialog = (row) => {
    isEditing.value = true
    editingId.value = row.id
    initialForm.value = {
      kode: row.kode || '',
      nama: row.nama || '',
      deskripsi: row.deskripsi || '',
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
        const res = await ExamTypeService.update(editingId.value, payload)
        const idx = examTypes.value.findIndex((t) => t.id === editingId.value)
        if (idx !== -1) {
          examTypes.value[idx] = { ...examTypes.value[idx], ...(res?.data?.data || payload) }
        }
        $q.notify({ type: 'positive', message: 'Jenis ujian diperbarui.' })
      } else {
        const res = await ExamTypeService.create(payload)
        const created = res?.data?.data
        if (created && typeof created === 'object') {
          examTypes.value = [created, ...examTypes.value]
        } else {
          await loadExamTypes()
        }
        $q.notify({ type: 'positive', message: 'Jenis ujian ditambahkan.' })
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

  const deleteExamType = async (row) => {
    if (!row?.id) return false
    try {
      await ExamTypeService.remove(row.id)
      examTypes.value = examTypes.value.filter((t) => t.id !== row.id)
      $q.notify({ type: 'positive', message: 'Jenis ujian dihapus.' })
      return true
    } catch (err) {
      const errCode = err?.response?.data?.error
      const msg =
        errCode === 'type_in_use'
          ? 'Jenis ujian tidak dapat dihapus karena masih dipakai di ujian.'
          : err?.response?.data?.message || 'Gagal menghapus data.'
      $q.notify({ type: 'negative', message: msg })
      return false
    }
  }

  // ── Import
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
      const res = await ExamTypeService.downloadTemplate(format)
      const blob = new Blob([res.data], {
        type:
          format === 'csv'
            ? 'text/csv;charset=utf-8'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `template_jenis_ujian_${Date.now()}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      $q.notify({ type: 'positive', message: `Template ${format.toUpperCase()} di-download.` })
      return { success: true }
    } catch (err) {
      $q.notify({ type: 'negative', message: `Gagal download template. \n ${err}` })
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
      const res = await ExamTypeService.parseImport(file)
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
      const res = await ExamTypeService.confirmImport(valid)
      const count = res?.data?.imported_count ?? valid.length
      $q.notify({ type: 'positive', message: `${count} jenis ujian berhasil diimport.` })
      await loadExamTypes()
      closeImportDialog()
      return { success: true }
    } catch (err) {
      $q.notify({ type: 'negative', message: err?.response?.data?.error || 'Gagal import.' })
      return { success: false }
    } finally {
      importing.value = false
    }
  }

  onMounted(loadExamTypes)

  return {
    examTypes,
    loading,
    errorState,
    searchQuery,
    filteredExamTypes,
    dialogOpen,
    isEditing,
    initialForm,
    submitting,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    submitForm,
    deleteExamType,
    loadExamTypes,
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
  }
}
