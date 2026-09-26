// src/composables/admin/useQuestionManagement.js
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { QuestionService } from '@/services/admin/QuestionService'
import { useAuthStore } from '@/stores/auth'
import { useProctorProfile } from '@/composables/proctor/useProctorProfile'
import { useExamWizard } from '@/composables/admin/useExamWizard'

export function useQuestionManagement() {
  const $q = useQuasar()
  const authStore = useAuthStore()
  const { fetchProfile, teachingSubjects } = useProctorProfile()

  // ── State
  const exams = ref([])
  const selectedExamId = ref('')
  const tab = ref('upload')
  const loadingExams = ref(false)
  const downloading = ref(false)
  const showTemplateDialog = ref(false)
  const errorState = ref(null)

  // ── Wizard integration
  const wizard = useExamWizard()

  const openWizard = async () => {
    await wizard.openDialog()
  }

  const onWizardSubmit = async () => {
    const result = await wizard.submitWizard()
    if (result.success && result.exam?.id) {
      // Pastikan exam ada di list, kalau tidak reload
      const exists = exams.value.find((e) => e.id === result.exam.id)
      if (!exists) {
        await loadExams()
      }
      selectedExamId.value = result.exam.id
    }
  }

  // ── Role detection
  const userRole = computed(() =>
    String(authStore.role || authStore.user?.role || '').toUpperCase(),
  )
  const isProctorRole = computed(() => ['PROCTOR', 'TEACHER'].includes(userRole.value))

  // ── Filter exams by role
  const filteredExams = computed(() => {
    const list = Array.isArray(exams.value) ? exams.value : []
    if (!isProctorRole.value) return list

    const subjects = teachingSubjects.value
      .map((s) => String(s?.name || '').toLowerCase())
      .filter(Boolean)
    if (subjects.length === 0) return []

    return list.filter((e) => {
      const subj = String(e.subject_nama || e.subject || e.nama || '').toLowerCase()
      return subjects.some((s) => subj.includes(s) || s.includes(subj))
    })
  })

  const examOptions = computed(() =>
    filteredExams.value.map((e) => ({
      label: e.nama || e.exam_name || '-',
      value: e.id,
    })),
  )

  const noExamHint = computed(() => {
    if (loadingExams.value) return 'Memuat daftar ujian...'
    if (!isProctorRole.value) return 'Belum ada ujian. Klik "Buat Ujian Baru" untuk memulai.'
    if (teachingSubjects.value.length === 0) return 'Anda belum memiliki mapel yang diampu.'
    return 'Tidak ada ujian untuk mapel yang Anda ampu.'
  })

  // ── Loaders
  const loadExams = async () => {
    loadingExams.value = true
    try {
      if (isProctorRole.value) await fetchProfile()
      const res = await QuestionService.getExams()
      const data = res?.data?.data ?? res?.data
      if (!Array.isArray(data)) {
        errorState.value = 'contract_mismatch'
        exams.value = []
        return
      }
      exams.value = data
      errorState.value = null
      if (!selectedExamId.value && examOptions.value.length > 0) {
        selectedExamId.value = examOptions.value[0].value
      }
    } catch (err) {
      const status = err?.response?.status
      if (!err.response) errorState.value = 'network_error'
      else errorState.value = 'server_error'
      exams.value = []
      console.warn('[useQuestionManagement] loadExams failed:', status, err?.message)
    } finally {
      loadingExams.value = false
    }
  }

  // ── Template download
  const downloadTemplate = async (format) => {
    downloading.value = true
    try {
      const res = await QuestionService.downloadTemplate(format)
      const blob = new Blob([res.data], {
        type:
          format === 'csv'
            ? 'text/csv'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `template_soal_${Date.now()}.${format === 'csv' ? 'csv' : 'xlsx'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      $q.notify({
        type: 'positive',
        message: `Template ${format.toUpperCase()} berhasil di-download.`,
      })
      showTemplateDialog.value = false
      return { success: true }
    } catch (err) {
      $q.notify({ type: 'negative', message: `Gagal download template. \n ${err}` })
      return { success: false }
    } finally {
      downloading.value = false
    }
  }

  onMounted(loadExams)

  return {
    exams,
    filteredExams,
    selectedExamId,
    tab,
    loadingExams,
    downloading,
    showTemplateDialog,
    errorState,
    examOptions,
    noExamHint,
    isProctorRole,
    teachingSubjects,
    loadExams,
    downloadTemplate,
    // wizard
    wizard,
    openWizard,
    onWizardSubmit,
  }
}
