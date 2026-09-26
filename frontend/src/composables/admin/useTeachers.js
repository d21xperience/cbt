// src/composables/admin/useTeachers.js
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { TeacherService } from '@/services/admin/TeacherService'
import { SubjectService } from '@/services/admin/SubjectService'
import { ClassService } from '@/services/admin/ClassService'

const EMPTY_FORM = {
  nip: '',
  nama: '',
  email: '',
  username: '',
  password: '',
  status: 'AKTIF',
  teaching_subject_ids: [],
  is_homeroom: false,
  homeroom_class_id: null,
}

export function useTeachers() {
  const $q = useQuasar()

  // ── List
  const teachers = ref([])
  const subjects = ref([])
  const classes = ref([])
  const loading = ref(false)
  const errorState = ref(null)

  // ── Filter
  const searchQuery = ref('')
  const filterStatus = ref(null)
  const filterHomeroom = ref(null)

  // ── Dialog CRUD
  const dialogOpen = ref(false)
  const isEditing = ref(false)
  const editingId = ref(null)
  const initialForm = ref({ ...EMPTY_FORM })
  const submitting = ref(false)
  const showPassword = ref(false)

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

  const subjectOptions = computed(() =>
    subjects.value.map((s) => ({
      label: `${s.kode} — ${s.nama}`,
      value: s.id,
    })),
  )

  const classOptions = computed(() =>
    classes.value.map((c) => ({
      label: `${c.nama} (Tingkat ${c.tingkat})`,
      value: c.id,
    })),
  )

  // ── Computed (list)
  const filteredTeachers = computed(() => {
    const list = Array.isArray(teachers.value) ? teachers.value : []
    const q = String(searchQuery.value || '')
      .trim()
      .toLowerCase()

    return list.filter((t) => {
      if (filterStatus.value && t.status !== filterStatus.value) return false
      if (filterHomeroom.value === 'YES' && !t.is_homeroom) return false
      if (filterHomeroom.value === 'NO' && t.is_homeroom) return false
      if (!q) return true
      return (
        String(t.nip || '')
          .toLowerCase()
          .includes(q) ||
        String(t.nama || '')
          .toLowerCase()
          .includes(q) ||
        String(t.username || '')
          .toLowerCase()
          .includes(q)
      )
    })
  })

  const importValidCount = computed(() => importPreview.value.filter((p) => !p._error).length)

  // ── Fetch
  const loadTeachers = async () => {
    loading.value = true
    try {
      const res = await TeacherService.list()
      const data = res?.data?.data ?? res?.data
      if (!Array.isArray(data)) {
        errorState.value = 'contract_mismatch'
        return
      }
      teachers.value = data
      errorState.value = null
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) errorState.value = 'endpoint_not_ready'
      else if (!err.response) errorState.value = 'network_error'
      else errorState.value = 'server_error'
      teachers.value = []
      console.warn('[useTeachers] loadTeachers failed:', status, err?.message)
    } finally {
      loading.value = false
    }
  }

  const loadRefs = async () => {
    try {
      const [subRes, clsRes] = await Promise.all([SubjectService.list(), ClassService.list()])
      subjects.value = Array.isArray(subRes?.data?.data) ? subRes.data.data : []
      classes.value = Array.isArray(clsRes?.data?.data) ? clsRes.data.data : []
    } catch (err) {
      console.warn('[useTeachers] loadRefs failed:', err?.message)
    }
  }

  // ── Dialog
  const openCreateDialog = () => {
    isEditing.value = false
    editingId.value = null
    initialForm.value = { ...EMPTY_FORM, teaching_subject_ids: [] }
    dialogOpen.value = true
  }

  const openEditDialog = (row) => {
    isEditing.value = true
    editingId.value = row.id
    initialForm.value = {
      nip: row.nip || '',
      nama: row.nama || '',
      email: row.email || '',
      username: row.username || '',
      password: '', // jangan pre-fill password
      status: row.status || 'AKTIF',
      teaching_subject_ids: Array.isArray(row.teaching_subject_ids)
        ? [...row.teaching_subject_ids]
        : [],
      is_homeroom: !!row.is_homeroom,
      homeroom_class_id: row.homeroom_class_id || null,
    }
    dialogOpen.value = true
  }

  const closeDialog = () => {
    dialogOpen.value = false
    isEditing.value = false
    editingId.value = null
    initialForm.value = { ...EMPTY_FORM }
    showPassword.value = false
  }

  const submitForm = async (payload) => {
    if (!payload) return { success: false }
    submitting.value = true
    try {
      if (isEditing.value && editingId.value) {
        const res = await TeacherService.update(editingId.value, payload)
        const idx = teachers.value.findIndex((t) => t.id === editingId.value)
        if (idx !== -1) {
          teachers.value[idx] = { ...teachers.value[idx], ...(res?.data?.data || payload) }
        }
        $q.notify({ type: 'positive', message: 'Guru diperbarui.' })
      } else {
        const res = await TeacherService.create(payload)
        const created = res?.data?.data
        if (created && typeof created === 'object') {
          teachers.value = [created, ...teachers.value]
        } else {
          await loadTeachers()
        }
        $q.notify({ type: 'positive', message: 'Guru ditambahkan.' })
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

  const deleteTeacher = async (row) => {
    if (!row?.id) return false
    try {
      await TeacherService.remove(row.id)
      teachers.value = teachers.value.filter((t) => t.id !== row.id)
      $q.notify({ type: 'positive', message: 'Guru dihapus.' })
      return true
    } catch (err) {
      const errCode = err?.response?.data?.error
      const msg =
        errCode === 'teacher_in_use'
          ? 'Guru tidak dapat dihapus karena masih wali kelas atau mengampu pembelajaran.'
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
      const res = await TeacherService.downloadTemplate(format)
      const blob = new Blob([res.data], {
        type:
          format === 'csv'
            ? 'text/csv;charset=utf-8'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `template_guru_${Date.now()}.${format}`
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
      const res = await TeacherService.parseImport(file)
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
      const res = await TeacherService.confirmImport(valid)
      const count = res?.data?.imported_count ?? valid.length
      $q.notify({ type: 'positive', message: `${count} guru berhasil diimport.` })
      await loadTeachers()
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
    loadTeachers()
    loadRefs()
  })

  return {
    teachers,
    subjects,
    classes,
    loading,
    errorState,
    searchQuery,
    filterStatus,
    filterHomeroom,
    filteredTeachers,
    statusOptions,
    subjectOptions,
    classOptions,
    dialogOpen,
    isEditing,
    initialForm,
    submitting,
    showPassword,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    submitForm,
    deleteTeacher,
    loadTeachers,
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
