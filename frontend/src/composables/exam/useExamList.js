// src/composables/exam/useExamList.js
// Adapter: mapping response backend → struktur yang dipakai komponen
import { ref, computed } from 'vue'
import { ExamService } from '@/services/exam/ActiveExamService'
import { useQuasar } from 'quasar'

// Backend status → UI status
function deriveStatus(raw) {
  if (raw.participant_status === 'COMPLETED') return 'completed'
  switch (raw.session_status) {
    case 'ACTIVE':
      return 'ready'
    case 'NOT_STARTED':
      return 'upcoming'
    case 'EXPIRED':
      return 'expired'
    case 'COMPLETED':
      return 'completed'
    default:
      return 'unknown'
  }
}

// Backend DTO → UI model (untuk kompat dengan template lama)
function adaptExam(raw) {
  return {
    id: raw.exam_id,
    sessionId: raw.session_id,
    subject: raw.title,
    teacher: raw.session_type === 'SUSULAN' ? 'Ujian Susulan' : 'Reguler',
    status: deriveStatus(raw),
    duration: raw.duration_minutes,
    startTime: formatTime(raw.start_time),
    endTime: formatTime(raw.end_time),
    sessionType: raw.session_type,
    participantStatus: raw.participant_status,
  }
}

function formatTime(iso) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function formatDate(iso) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

export function useExamList() {
  const $q = useQuasar()
  const loading = ref(false)
  const exams = ref([])
  const history = ref([])

  const activeExams = computed(() =>
    exams.value.filter((e) => e.status === 'ready' || e.status === 'upcoming'),
  )
  const completedExams = computed(() => exams.value.filter((e) => e.status === 'completed'))

  const fetchExams = async () => {
    console.log('fetchExams')
    loading.value = true
    try {
      const { data } = await ExamService.getActiveExams()
      console.log(data)
      const rows = data.data || []
      exams.value = rows.map(adaptExam)
    } catch (error) {
      console.error('Fetch exams error:', error)
      const status = error.response?.status
      if (status === 401) {
        $q.notify({ type: 'negative', message: 'Sesi habis. Login ulang.', position: 'top' })
      } else {
        $q.notify({ type: 'negative', message: 'Gagal memuat daftar ujian', position: 'top' })
      }
    } finally {
      loading.value = false
    }
  }

  const fetchHistory = async () => {
    try {
      const { data } = await ExamService.getExamHistory()
      history.value = (data.data || []).map((h) => ({
        id: h.exam_id,
        subject: h.title || h.exam_id,
        completedAt: formatDate(h.submitted_at),
        score: h.final_score,
        status: h.status,
      }))
    } catch (error) {
      console.error('Fetch history error:', error)
    }
  }
  const dashboard = ref({ scheduled: [], makeup_available: [], completed: [] })

  const fetchDashboard = async () => {
    loading.value = true
    try {
      const { data } = await ExamService.getDashboard()
      dashboard.value = data.data || { scheduled: [], makeup_available: [], completed: [] }
    } catch (error) {
      console.error('Dashboard error:', error)
    } finally {
      loading.value = false
    }
  }

  const verifyToken = async (examId, token) => {
    const { data } = await ExamService.verifyToken(examId, token)
    return data // {valid, token (JWT-B), session_id, ...}
  }

  return {
    loading,
    exams,
    history,
    dashboard,
    activeExams,
    completedExams,
    fetchExams,
    fetchHistory,
    verifyToken,
    fetchDashboard,
  }
}
