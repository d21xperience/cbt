// src/composables/admin/useClasses.js
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { ClassService } from '@/services/admin/ClassService'
import { SchoolProfileService } from '@/services/admin/SchoolProfileService'

const EMPTY_FORM = {
  nama: '',
  tingkat: '',
  kurikulum: 'K13',
  jenis_rombel: 'REGULER',
  program_keahlian_id: null,
  wali_kelas_id: null,
}

export function useClasses() {
  const $q = useQuasar()

  // ── List
  const classes = ref([])
  const teachers = ref([])
  const loading = ref(false)
  const errorState = ref(null)

  // ── School context (untuk filter tingkat + program keahlian)
  const schoolJenjang = ref(null)
  const programDurationYears = ref(3)

  // ── Filter
  const searchQuery = ref('')
  const filterTingkat = ref(null)
  const filterJenisRombel = ref(null)

  // ── Dialog CRUD
  const dialogOpen = ref(false)
  const isEditing = ref(false)
  const editingId = ref(null)
  const initialForm = ref({ ...EMPTY_FORM })
  const submitting = ref(false)

  // ── Import dialog
  const importDialogOpen = ref(false)
  const importStep = ref(1)
  const importFile = ref(null)
  const importPreview = ref([])
  const importErrors = ref([])
  const importing = ref(false)
  const downloadingTemplate = ref(false)

  // ── Options
  const kurikulumOptions = [
    { label: 'K13', value: 'K13' },
    { label: 'Merdeka', value: 'MERDEKA' },
  ]

  const jenisRombelOptions = [
    { label: 'Reguler', value: 'REGULER' },
    { label: 'Pilihan', value: 'PILIHAN' },
    { label: 'Ekstrakurikuler', value: 'EKSKUL' },
    { label: 'Lainnya', value: 'LAINNYA' },
  ]

  // ── Tingkat options (dynamic by jenjang)
  const tingkatOptions = computed(() => {
    const j = String(schoolJenjang.value || '').toUpperCase()
    const build = (start, end) => {
      const out = []
      for (let i = start; i <= end; i++) {
        out.push({ label: `Tingkat ${i}`, value: String(i) })
      }
      return out
    }
    if (j === 'SMP' || j === 'MTS') return build(7, 9)
    if (j === 'SMA' || j === 'MA') return build(10, 12)
    if (j === 'SMK' || j === 'MAK') {
      const dur = Number(programDurationYears.value) || 3
      return build(10, 10 + dur - 1)
    }
    return build(10, 12)
  })

  const showProgramKeahlian = computed(() => {
    const j = String(schoolJenjang.value || '').toUpperCase()
    return j === 'SMK' || j === 'MAK'
  })

  const teacherOptions = computed(() =>
    teachers.value.map((t) => ({
      label: `${t.nama}${t.nip ? ` (${t.nip})` : ''}`,
      value: t.id,
    })),
  )

  // ── Computed (list)
  const filteredClasses = computed(() => {
    const list = Array.isArray(classes.value) ? classes.value : []
    const q = String(searchQuery.value || '').trim().toLowerCase()

    return list.filter((c) => {
      if (filterTingkat.value && c.tingkat !== filterTingkat.value) return false
      if (filterJenisRombel.value && c.jenis_rombel !== filterJenisRombel.value) return false
      if (!q) return true
      return (
        String(c.nama || '').toLowerCase().includes(q) ||
        String(c.wali_kelas_nama || '').toLowerCase().includes(q)
      )
    })
  })

  const importValidCount = computed(() =>
    importPreview.value.filter((p) => !p._error).length,
  )

  // ── Fetch
  const loadSchoolContext = async () => {
    try {
      const res = await SchoolProfileService.getProfile()
      const data = res?.data?.data ?? res?.data ?? {}
      schoolJenjang.value = data.jenjang || null
      programDurationYears.value = Number(data.program_duration_years) || 3
    } catch (err) {
      console.warn('[useClasses] loadSchoolContext failed:', err?.message)
    }
  }

  const loadClasses = async () => {
    loading.value = true
    try {
      const res = await ClassService.list()
      const data = res?.data?.data ?? res?.data
      if (!Array.isArray(data)) {
        errorState.value = 'contract_mismatch'
        return
      }
      classes.value = data
      errorState.value = null
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) errorState.value = 'endpoint_not_ready'
      else if (!err.response) errorState.value = 'network_error'
      else errorState.value = 'server_error'
      classes.value = []
      console.warn('[useClasses] loadClasses failed:', status, err?.message)
    } finally {
      loading.value = false
    }
  }

  const loadTeachers = async () => {
    try {
      const res = await ClassService.listTeachers()
      const data = res?.data?.data ?? res?.data
      teachers.value = Array.isArray(data) ? data : []
    } catch (err) {
      if (err?.response?.status !== 404) {
        console.warn('[useClasses] loadTeachers failed:', err?.message)
      }
      teachers.value = []
    }
  }

  // ── Dialog CRUD
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
      nama: row.nama || '',
      tingkat: row.tingkat || '',
      kurikulum: row.kurikulum || 'K13',
      jenis_rombel: row.jenis_rombel || 'REGULER',
      program_keahlian_id: row.program_keahlian_id || null,
      wali_kelas_id: row.wali_kelas_id || null,
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
        const res = await ClassService.update(editingId.value, payload)
        const idx = classes.value.findIndex((c) => c.id === editingId.value)
        if (idx !== -1) {
          classes.value[idx] = { ...classes.value[idx], ...(res?.data?.data || payload) }
        }
        $q.notify({ type: 'positive', message: 'Kelas diperbarui.' })
      } else {
        const res = await ClassService.create(payload)
        const created = res?.data?.data
        if (created && typeof created === 'object') {
          classes.value = [created, ...classes.value]
        } else {
          await loadClasses()
        }
        $q.notify({ type: 'positive', message: 'Kelas ditambahkan.' })
      }
      closeDialog()
      return { success: true }
    } catch (err) {
      $q.notify({
        type: 'negative',
        message:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Gagal menyimpan data.',
      })
      return { success: false }
    } finally {
      submitting.value = false
    }
  }

  const deleteClass = async (row) => {
    if (!row?.id) return false
    try {
      await ClassService.remove(row.id)
      classes.value = classes.value.filter((c) => c.id !== row.id)
      $q.notify({ type: 'positive', message: 'Kelas dihapus.' })
      return true
    } catch (err) {
      const errCode = err?.response?.data?.error
      const msg =
        errCode === 'class_has_students'
          ? 'Kelas tidak dapat dihapus karena masih memiliki siswa.'
          : err?.response?.data?.message || 'Gagal menghapus data.'
      $q.notify({ type: 'negative', message: msg })
      return false
    }
  }

  // ── Import
  const openImportDialog = () => {
    importDialogOpen.value = true
    importStep.value = 1
    importFile.value = null
    importPreview.value = []
    importErrors.value = []
  }

  const closeImportDialog = () => {
    importDialogOpen.value = false
    importStep.value = 1
    importFile.value = null
    importPreview.value = []
    importErrors.value = []
  }

  const downloadTemplate = async (format = 'csv') => {
    downloadingTemplate.value = true
    try {
      const res = await ClassService.downloadTemplate(format)
      const blob = new Blob([res.data], {
        type:
          format === 'csv'
            ? 'text/csv;charset=utf-8'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `template_kelas_${Date.now()}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      $q.notify({ type: 'positive', message: `Template ${format.toUpperCase()} berhasil di-download.` })
      return { success: true }
    } catch (err) {
      console.warn('[useClasses] downloadTemplate failed:', err?.message)
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
      const res = await ClassService.parseImport(file)
      const payload = res?.data || {}
      importPreview.value = Array.isArray(payload.data) ? payload.data : []
      importErrors.value = Array.isArray(payload.errors) ? payload.errors : []
      return {
        success: true,
        total: importPreview.value.length,
        valid: importValidCount.value,
        invalid: importPreview.value.length - importValidCount.value,
      }
    } catch (err) {
      importErrors.value = [{ row: 0, message: err?.response?.data?.error || 'Gagal parse file.' }]
      $q.notify({ type: 'negative', message: err?.response?.data?.error || 'Gagal parse file CSV.' })
      return { success: false }
    } finally {
      importing.value = false
    }
  }

  const confirmImport = async () => {
    const validRows = importPreview.value.filter((p) => !p._error)
    if (validRows.length === 0) {
      $q.notify({ type: 'warning', message: 'Tidak ada baris valid.' })
      return { success: false }
    }
    importing.value = true
    try {
      const res = await ClassService.confirmImport(validRows)
      const count =
        res?.data?.imported_count ?? res?.data?.data?.imported_count ?? validRows.length
      $q.notify({ type: 'positive', message: `${count} kelas berhasil diimport.` })
      await loadClasses()
      closeImportDialog()
      return { success: true, imported_count: count }
    } catch (err) {
      $q.notify({ type: 'negative', message: err?.response?.data?.error || 'Gagal import kelas.' })
      return { success: false }
    } finally {
      importing.value = false
    }
  }

  onMounted(() => {
    loadSchoolContext()
    loadClasses()
    loadTeachers()
  })

  return {
    // list
    classes,
    loading,
    errorState,
    // school context
    schoolJenjang,
    programDurationYears,
    showProgramKeahlian,
    // filter
    searchQuery,
    filterTingkat,
    filterJenisRombel,
    filteredClasses,
    // options
    tingkatOptions,
    kurikulumOptions,
    jenisRombelOptions,
    teacherOptions,
    // dialog CRUD
    dialogOpen,
    isEditing,
    initialForm,
    submitting,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    submitForm,
    deleteClass,
    loadClasses,
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
  }
}
