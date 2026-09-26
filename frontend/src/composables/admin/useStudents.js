// src/composables/admin/useStudents.js
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { StudentService } from '@/services/admin/StudentService'
import { ClassService } from '@/services/admin/ClassService'

const EMPTY_FORM = {
  nisn: '',
  nis: '',
  nama: '',
  jenis_kelamin: 'L',
  tanggal_lahir: '',
  kelas_id: null,
  status: 'AKTIF',
}

export function useStudents() {
  const $q = useQuasar()

  // ── List
  const students = ref([])
  const classes = ref([])
  const loading = ref(false)
  const errorState = ref(null)

  // ── Filter
  const searchQuery = ref('')
  const filterKelas = ref(null)
  const filterStatus = ref(null)
  const filterGender = ref(null)

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
  const statusOptions = [
    { label: 'Aktif', value: 'AKTIF' },
    { label: 'Nonaktif', value: 'NONAKTIF' },
  ]

  const genderOptions = [
    { label: 'Laki-laki', value: 'L' },
    { label: 'Perempuan', value: 'P' },
  ]

  const classOptions = computed(() =>
    classes.value.map((c) => ({
      label: `${c.nama} (Tingkat ${c.tingkat})`,
      value: c.id,
    })),
  )

  // ── Computed (list)
  const filteredStudents = computed(() => {
    const list = Array.isArray(students.value) ? students.value : []
    const q = String(searchQuery.value || '')
      .trim()
      .toLowerCase()

    return list.filter((s) => {
      if (filterKelas.value && s.kelas_id !== filterKelas.value) return false
      if (filterStatus.value && s.status !== filterStatus.value) return false
      if (filterGender.value && s.jenis_kelamin !== filterGender.value) return false
      if (!q) return true
      return (
        String(s.nisn || '')
          .toLowerCase()
          .includes(q) ||
        String(s.nis || '')
          .toLowerCase()
          .includes(q) ||
        String(s.nama || '')
          .toLowerCase()
          .includes(q)
      )
    })
  })

  const importValidCount = computed(() => importPreview.value.filter((p) => !p._error).length)

  // ── Fetch
  const loadStudents = async () => {
    loading.value = true
    try {
      const res = await StudentService.list()
      const data = res?.data?.data ?? res?.data
      if (!Array.isArray(data)) {
        errorState.value = 'contract_mismatch'
        return
      }
      students.value = data
      errorState.value = null
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) errorState.value = 'endpoint_not_ready'
      else if (!err.response) errorState.value = 'network_error'
      else errorState.value = 'server_error'
      students.value = []
      console.warn('[useStudents] loadStudents failed:', status, err?.message)
    } finally {
      loading.value = false
    }
  }

  const loadClasses = async () => {
    try {
      const res = await ClassService.list()
      classes.value = Array.isArray(res?.data?.data) ? res.data.data : []
    } catch (err) {
      console.warn('[useStudents] loadClasses failed:', err?.message)
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
      nisn: row.nisn || '',
      nis: row.nis || '',
      nama: row.nama || '',
      jenis_kelamin: row.jenis_kelamin || 'L',
      tanggal_lahir: row.tanggal_lahir || '',
      kelas_id: row.kelas_id || null,
      status: row.status || 'AKTIF',
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
        const res = await StudentService.update(editingId.value, payload)
        const idx = students.value.findIndex((s) => s.id === editingId.value)
        if (idx !== -1) {
          students.value[idx] = { ...students.value[idx], ...(res?.data?.data || payload) }
        }
        $q.notify({ type: 'positive', message: 'Siswa diperbarui.' })
      } else {
        const res = await StudentService.create(payload)
        const created = res?.data?.data
        if (created && typeof created === 'object') {
          students.value = [created, ...students.value]
        } else {
          await loadStudents()
        }
        $q.notify({ type: 'positive', message: 'Siswa ditambahkan.' })
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

  const deleteStudent = async (row) => {
    if (!row?.id) return false
    try {
      await StudentService.remove(row.id)
      students.value = students.value.filter((s) => s.id !== row.id)
      $q.notify({ type: 'positive', message: 'Siswa dihapus.' })
      return true
    } catch (err) {
      const errCode = err?.response?.data?.error
      const msg =
        errCode === 'student_in_use'
          ? 'Siswa tidak dapat dihapus karena masih terdaftar di ujian.'
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
      const res = await StudentService.downloadTemplate(format)
      const blob = new Blob([res.data], {
        type:
          format === 'csv'
            ? 'text/csv;charset=utf-8'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `template_siswa_${Date.now()}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      $q.notify({ type: 'positive', message: `Template ${format.toUpperCase()} di-download.` })
      return { success: true }
    } catch (err) {
      $q.notify({ type: 'negative', message: `Gagal download template. ${err}` })
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
      const res = await StudentService.parseImport(file)
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
      const res = await StudentService.confirmImport(valid)
      const count = res?.data?.imported_count ?? valid.length
      $q.notify({ type: 'positive', message: `${count} siswa berhasil diimport.` })
      await loadStudents()
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
    loadStudents()
    loadClasses()
  })

  return {
    students,
    classes,
    loading,
    errorState,
    searchQuery,
    filterKelas,
    filterStatus,
    filterGender,
    filteredStudents,
    statusOptions,
    genderOptions,
    classOptions,
    dialogOpen,
    isEditing,
    initialForm,
    submitting,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    submitForm,
    deleteStudent,
    loadStudents,
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
