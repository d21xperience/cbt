// src/composables/admin/useLessons.js
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { LessonService } from '@/services/admin/LessonService'
import { SubjectService } from '@/services/admin/SubjectService'
import { ClassService } from '@/services/admin/ClassService'
import { TeacherService } from '@/services/admin/TeacherService'

const EMPTY_FORM = {
  subject_id: null,
  class_id: null,
  teacher_id: null,
  academic_year: '2025/2026',
  semester: 'GANJIL',
}

export function useLessons() {
  const $q = useQuasar()

  // ── List + refs
  const lessons = ref([])
  const subjects = ref([])
  const classes = ref([])
  const teachers = ref([])
  const loading = ref(false)
  const errorState = ref(null)

  // ── Filter
  const searchQuery = ref('')
  const filterClass = ref(null)
  const filterTeacher = ref(null)
  const filterSemester = ref(null)

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
  const semesterOptions = [
    { label: 'Ganjil', value: 'GANJIL' },
    { label: 'Genap', value: 'GENAP' },
  ]

  const subjectOptions = computed(() =>
    subjects.value.map((s) => ({ label: `${s.kode} — ${s.nama}`, value: s.id })),
  )
  const classOptions = computed(() =>
    classes.value.map((c) => ({ label: `${c.nama} (Tingkat ${c.tingkat})`, value: c.id })),
  )
  const teacherOptions = computed(() =>
    teachers.value.map((t) => ({ label: `${t.nama}${t.nip ? ` (${t.nip})` : ''}`, value: t.id })),
  )

  // ── Computed
  const filteredLessons = computed(() => {
    const list = Array.isArray(lessons.value) ? lessons.value : []
    const q = String(searchQuery.value || '')
      .trim()
      .toLowerCase()

    return list.filter((l) => {
      if (filterClass.value && l.class_id !== filterClass.value) return false
      if (filterTeacher.value && l.teacher_id !== filterTeacher.value) return false
      if (filterSemester.value && l.semester !== filterSemester.value) return false
      if (!q) return true
      return (
        String(l.subject_nama || '')
          .toLowerCase()
          .includes(q) ||
        String(l.class_nama || '')
          .toLowerCase()
          .includes(q) ||
        String(l.teacher_nama || '')
          .toLowerCase()
          .includes(q)
      )
    })
  })

  const importValidCount = computed(() => importPreview.value.filter((p) => !p._error).length)

  // ── Fetch
  const loadLessons = async () => {
    loading.value = true
    try {
      const res = await LessonService.list()
      const data = res?.data?.data ?? res?.data
      if (!Array.isArray(data)) {
        errorState.value = 'contract_mismatch'
        return
      }
      lessons.value = data
      errorState.value = null
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) errorState.value = 'endpoint_not_ready'
      else if (!err.response) errorState.value = 'network_error'
      else errorState.value = 'server_error'
      lessons.value = []
      console.warn('[useLessons] loadLessons failed:', status, err?.message)
    } finally {
      loading.value = false
    }
  }

  const loadRefs = async () => {
    try {
      const [subRes, clsRes, tchRes] = await Promise.all([
        SubjectService.list(),
        ClassService.list(),
        TeacherService.list(),
      ])
      subjects.value = Array.isArray(subRes?.data?.data) ? subRes.data.data : []
      classes.value = Array.isArray(clsRes?.data?.data) ? clsRes.data.data : []
      teachers.value = Array.isArray(tchRes?.data?.data) ? tchRes.data.data : []
    } catch (err) {
      console.warn('[useLessons] loadRefs failed:', err?.message)
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
      subject_id: row.subject_id || null,
      class_id: row.class_id || null,
      teacher_id: row.teacher_id || null,
      academic_year: row.academic_year || '2025/2026',
      semester: row.semester || 'GANJIL',
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
        const res = await LessonService.update(editingId.value, payload)
        const idx = lessons.value.findIndex((l) => l.id === editingId.value)
        if (idx !== -1) {
          lessons.value[idx] = { ...lessons.value[idx], ...(res?.data?.data || payload) }
        }
        $q.notify({ type: 'positive', message: 'Pembelajaran diperbarui.' })
      } else {
        const res = await LessonService.create(payload)
        const created = res?.data?.data
        if (created && typeof created === 'object') {
          lessons.value = [created, ...lessons.value]
        } else {
          await loadLessons()
        }
        $q.notify({ type: 'positive', message: 'Pembelajaran ditambahkan.' })
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

  const deleteLesson = async (row) => {
    if (!row?.id) return false
    try {
      await LessonService.remove(row.id)
      lessons.value = lessons.value.filter((l) => l.id !== row.id)
      $q.notify({ type: 'positive', message: 'Pembelajaran dihapus.' })
      return true
    } catch (err) {
      const errCode = err?.response?.data?.error
      const msg =
        errCode === 'lesson_in_use'
          ? 'Pembelajaran tidak dapat dihapus karena masih dipakai di ujian.'
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
      const res = await LessonService.downloadTemplate(format)
      const blob = new Blob([res.data], {
        type:
          format === 'csv'
            ? 'text/csv;charset=utf-8'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `template_pembelajaran_${Date.now()}.${format}`
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
      const res = await LessonService.parseImport(file)
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
      const res = await LessonService.confirmImport(valid)
      const count = res?.data?.imported_count ?? valid.length
      $q.notify({ type: 'positive', message: `${count} pembelajaran berhasil diimport.` })
      await loadLessons()
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
    loadLessons()
    loadRefs()
  })

  return {
    lessons,
    subjects,
    classes,
    teachers,
    loading,
    errorState,
    searchQuery,
    filterClass,
    filterTeacher,
    filterSemester,
    filteredLessons,
    semesterOptions,
    subjectOptions,
    classOptions,
    teacherOptions,
    dialogOpen,
    isEditing,
    initialForm,
    submitting,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    submitForm,
    deleteLesson,
    loadLessons,
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
