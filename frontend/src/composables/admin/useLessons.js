// src/composables/admin/useLessons.js
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAcademicStore } from '@/stores/academic'
import { LessonService } from '@/services/admin/LessonService'
import { SubjectService } from '@/services/admin/SubjectService'
import { ClassService } from '@/services/admin/ClassService'
import { TeacherService } from '@/services/admin/TeacherService'

const EMPTY_FORM = {
  subject_id: null,
  class_ids: [],
  teacher_id: null,
  is_exam_author: false,
  academic_year: '2025/2026',
  semester: 'GANJIL',
}

export function useLessons() {
  const $q = useQuasar()
  const academicStore = useAcademicStore()

  const lessons = ref([])
  const subjects = ref([])
  const classes = ref([])
  const teachers = ref([])
  const loading = ref(false)
  const errorState = ref(null)

  const searchQuery = ref('')
  const filterClass = ref(null)
  const filterTeacher = ref(null)
  const filterSemester = ref(null)

  const dialogOpen = ref(false)
  const isEditing = ref(false)
  const editingId = ref(null)
  const initialForm = ref({ ...EMPTY_FORM })
  const submitting = ref(false)

  const importDialogOpen = ref(false)
  const importStep = ref(1)
  const importPreview = ref([])
  const importErrors = ref([])
  const importing = ref(false)
  const downloadingTemplate = ref(false)

  const semesterOptions = [
    { label: 'Ganjil', value: 'GANJIL' },
    { label: 'Genap', value: 'GENAP' },
  ]

  // ✅ FIX: Tampilkan SEMUA mapel. Filtering kelas dilakukan di dalam Dialog.
  const subjectOptions = computed(() => {
    return subjects.value.map((s) => ({ label: `${s.kode} — ${s.nama}`, value: s.id }))
  })
  
  const classOptions = computed(() =>
    classes.value.map((c) => ({ label: `${c.nama} (Tingkat ${c.tingkat})`, value: c.id })),
  )
  
  const teacherOptions = computed(() =>
    teachers.value.map((t) => ({ label: `${t.nama}${t.nip ? ` (${t.nip})` : ''}`, value: t.id })),
  )

  const filteredLessons = computed(() => {
    const list = Array.isArray(lessons.value) ? lessons.value : []
    const q = String(searchQuery.value || '').trim().toLowerCase()

    return list.filter((l) => {
      if (filterClass.value && l.class_id !== filterClass.value) return false
      if (filterTeacher.value && l.teacher_id !== filterTeacher.value) return false

      if (!q) return true
      return (
        String(l.subject_nama || '').toLowerCase().includes(q) ||
        String(l.class_nama || '').toLowerCase().includes(q) ||
        String(l.teacher_nama || '').toLowerCase().includes(q)
      )
    })
  })

  const importValidCount = computed(() => importPreview.value.filter((p) => !p._error).length)

  const loadLessons = async () => {
    loading.value = true
    try {
      const res = await LessonService.list({
        academic_period_id: academicStore.active_period_id,
      })
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
  
  watch(
    () => academicStore.active_period_id,
    () => { loadLessons() },
  )

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
      class_ids: [row.class_id], 
      teacher_id: row.teacher_id || null,
      is_exam_author: Boolean(row.is_exam_author), // Antisipasi return 1/0 dari SQLite
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

    payload.academic_period_id = academicStore.active_period_id
    delete payload.academic_year
    delete payload.semester

    const classIds = payload.class_ids || []
    delete payload.class_ids

    submitting.value = true
    try {
      if (isEditing.value && editingId.value) {
        payload.class_id = classIds[0]
        const res = await LessonService.update(editingId.value, payload)
        const idx = lessons.value.findIndex((l) => l.id === editingId.value)
        if (idx !== -1) {
          lessons.value[idx] = { ...lessons.value[idx], ...(res?.data?.data || payload) }
        }
        $q.notify({ type: 'positive', message: 'Pembelajaran diperbarui.' })
      } else {
        const promises = classIds.map(cid => {
          return LessonService.create({ ...payload, class_id: cid })
        })
        await Promise.all(promises)
        await loadLessons()
        $q.notify({ type: 'positive', message: `${classIds.length} Pembelajaran berhasil ditambahkan.` })
      }
      closeDialog()
      return { success: true }
    } catch (err) {
      const errCode = err?.response?.data?.error
      let msg = 'Gagal menyimpan data.'
      if (errCode === 'duplicate_lesson') {
        msg = 'Beberapa kelas yang dipilih sudah diampu oleh guru lain untuk mapel ini.'
      } else if (errCode === 'validation_failed') {
        msg = 'Semua field wajib diisi.'
      } else if (err?.response?.data?.message) {
        msg = err.response.data.message
      }
      $q.notify({ type: 'negative', message: msg })
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
      const msg = errCode === 'lesson_in_use'
          ? 'Pembelajaran tidak dapat dihapus karena masih dipakai di ujian.'
          : err?.response?.data?.message || 'Gagal menghapus data.'
      $q.notify({ type: 'negative', message: msg })
      return false
    }
  }

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

  const downloadTemplate = async (format = 'xlsx') => {
    downloadingTemplate.value = true
    try {
      const res = await LessonService.downloadTemplate(format)
      const blob = new Blob([res.data], {
        type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
      $q.notify({ type: 'negative', message: `Gagal membaca file import: ${err}` })
      return { success: false }
    } finally {
      importing.value = false
    }
  }

  const confirmImport = async () => {
    const validRows = importPreview.value.filter((p) => !p._error)
    if (validRows.length === 0) {
      $q.notify({ type: 'warning', message: 'Tidak ada baris valid untuk diimport.' })
      return
    }
    importing.value = true
    try {
      const res = await LessonService.confirmImport(validRows)
      const count = res?.data?.imported_count || 0
      $q.notify({ type: 'positive', message: `${count} pembelajaran berhasil diimport.` })
      closeImportDialog()
      await loadLessons()
    } catch (err) {
      $q.notify({ type: 'negative', message: `Gagal import: ${err?.message || err}` })
    } finally {
      importing.value = false
    }
  }

  onMounted(() => {
    loadRefs()
    loadLessons()
  })

  return {
    lessons,
    filteredLessons,
    loading,
    errorState,
    searchQuery,
    filterClass,
    filterTeacher,
    filterSemester,
    classOptions,
    teacherOptions,
    subjectOptions,
    semesterOptions,
    dialogOpen,
    isEditing,
    initialForm,
    submitting,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    submitForm,
    deleteLesson,
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
