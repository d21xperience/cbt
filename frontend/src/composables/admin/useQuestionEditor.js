// src/composables/admin/useQuestionEditor.js
//
// Composable: editor soal per exam.
// Responsibility:
//   - state: exam, questions, dialog, form
//   - CRUD soal
//   - dirty check per dialog

import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { QuestionService } from '@/services/admin/QuestionService'

import { useDynamicOptions } from './useDynamicOptions'
// ...
const { createDefaultOptions } = useDynamicOptions()

const buildEmptyForm = () => ({
  question_type: 'PG',
  question_text: '',
  options: createDefaultOptions(4),
  score: 10,
  media_url: '',
  rubric: '',
})
const EMPTY_FORM = buildEmptyForm()

export function useQuestionEditor() {
  const $q = useQuasar()
  const route = useRoute()
  const examId = computed(() => route.params.examId)

  // ── State
  const loading = ref(false)
  const saving = ref(false)
  const errorState = ref(null)
  const exam = ref(null)
  const questions = ref([])

  // ── Dialog
  const dialogOpen = ref(false)
  const isEditing = ref(false)
  const editingId = ref(null)
  const initialForm = ref({ ...EMPTY_FORM })
  const submitting = ref(false)

  // ── Computed
  const totalScore = computed(() => questions.value.reduce((s, q) => s + (Number(q.score) || 0), 0))
  const stats = computed(() => {
    const list = questions.value
    return {
      total: list.length,
      pg: list.filter((q) => q.question_type === 'PG').length,
      essay: list.filter((q) => q.question_type === 'ESSAY').length,
      totalScore: totalScore.value,
    }
  })

  // ── Loaders
  const loadExam = async () => {
    try {
      const res = await QuestionService.getExam(examId.value)
      exam.value = res?.data?.data ?? res?.data ?? null
    } catch (err) {
      console.warn('[useQuestionEditor] loadExam failed:', err?.message)
    }
  }

  const loadQuestions = async () => {
    loading.value = true
    try {
      const res = await QuestionService.listQuestions(examId.value)
      const data = res?.data?.data ?? res?.data
      questions.value = Array.isArray(data) ? data : []
      errorState.value = null
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) errorState.value = 'endpoint_not_ready'
      else if (!err.response) errorState.value = 'network_error'
      else errorState.value = 'server_error'
      questions.value = []
      console.warn('[useQuestionEditor] loadQuestions failed:', status, err?.message)
    } finally {
      loading.value = false
    }
  }

  // ── Dialog
  const openCreate = () => {
    isEditing.value = false
    editingId.value = null
    initialForm.value = buildEmptyForm()
    dialogOpen.value = true
  }

  const openEdit = (row) => {
    isEditing.value = true
    editingId.value = row.id

    // Normalize options: dukung array baru & objek lama { A, B, C, D }
    let opts = []
    if (Array.isArray(row.options)) {
      opts = row.options.map((o) => ({
        id: o.id || `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: o.text || '',
        media_url: o.media_url || null,
        is_correct: !!o.is_correct || o.id === row.correct_option_id,
        is_other: !!o.is_other,
      }))
    } else if (row.options && typeof row.options === 'object') {
      // Legacy: { A: 'text', B: 'text', ... }
      opts = Object.entries(row.options).map(([key, text]) => ({
        id: `opt-legacy-${key}`,
        text: String(text || ''),
        media_url: null,
        is_correct: key === row.correct_option,
        is_other: false,
      }))
    }
    if (opts.length === 0) opts = createDefaultOptions(4)

    initialForm.value = {
      question_type: row.question_type || 'PG',
      question_text: row.question_text || '',
      options: opts,
      score: Number(row.score) || 10,
      media_url: row.media_url || '',
      rubric: row.rubric || '',
    }
    dialogOpen.value = true
  }

  const closeDialog = () => {
    dialogOpen.value = false
    isEditing.value = false
    editingId.value = null
    initialForm.value = { ...EMPTY_FORM }
  }

  // ── CRUD
  const submitForm = async (payload) => {
    if (!payload) return { success: false }
    submitting.value = true
    try {
      const body = {
        exam_id: examId.value,
        ...payload,
        correct_option: payload.options?.find((o) => o.is_correct)?.id || null,
      }

      if (isEditing.value && editingId.value) {
        const res = await QuestionService.updateQuestion(editingId.value, body)
        const idx = questions.value.findIndex((q) => q.id === editingId.value)
        if (idx !== -1) {
          questions.value[idx] = { ...questions.value[idx], ...(res?.data?.data || body) }
        }
        $q.notify({ type: 'positive', message: 'Soal diperbarui.' })
      } else {
        const res = await QuestionService.createQuestion(body)
        const created = res?.data?.data
        if (created && typeof created === 'object') {
          questions.value.push(created)
        } else {
          await loadQuestions()
        }
        $q.notify({ type: 'positive', message: 'Soal ditambahkan.' })
      }
      closeDialog()
      return { success: true }
    } catch (err) {
      $q.notify({
        type: 'negative',
        message:
          err?.response?.data?.error || err?.response?.data?.message || 'Gagal menyimpan soal.',
      })
      return { success: false }
    } finally {
      submitting.value = false
    }
  }

  const deleteQuestion = async (row) => {
    try {
      await QuestionService.deleteQuestion(row.id)
      questions.value = questions.value.filter((q) => q.id !== row.id)
      $q.notify({ type: 'positive', message: 'Soal dihapus.' })
      return true
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: err?.response?.data?.error || 'Gagal menghapus soal.',
      })
      return false
    }
  }

  onMounted(() => {
    loadExam()
    loadQuestions()
  })

  return {
    examId,
    exam,
    questions,
    loading,
    saving,
    submitting,
    errorState,
    dialogOpen,
    isEditing,
    initialForm,
    stats,
    openCreate,
    openEdit,
    closeDialog,
    submitForm,
    deleteQuestion,
    loadQuestions,
  }
}
