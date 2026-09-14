// src/composables/useExamList.js
import { ref, computed } from 'vue'
import { ExamService } from '@/services/exam/ActiveExamService'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'

export function useExamList() {
  const $q = useQuasar()
  const loading = ref(false)
  const exams = ref([])
  const authStore = useAuthStore()
  // const history = ref([])
  // 🚀 AMBIL ID USER YANG SEDANG LOGIN
  const currentUserId = computed(() => authStore.user?.id || authStore.getUser?.id)
  // const participantName = computed(() => authStore.user?.name || 'Siswa')
  // Fetch data dari API/mock
  const fetchExams = async () => {
    // Validasi: Harus ada user yang login
    if (!currentUserId.value) {
      $q.notify({
        type: 'warning',
        message: 'Sesi peserta tidak ditemukan. Silakan login ulang.',
        position: 'top',
      })
      return
    }
    loading.value = true
    try {
      const response = await ExamService.getActiveExams(currentUserId.value)
      // console.log('📢 fetchExam', response)
      exams.value = response.data || []
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Gagal memuat daftar ujian',
        position: 'top',
      })
      console.error('Fetch exams error:', error)
    } finally {
      loading.value = false
    }
  }

  // Computed: ujian yang siap (status 'ready')
  const activeExams = computed(() => {
    return exams.value.filter((exam) => exam.status === 'ready' || exam.status === 'upcoming')
  })

  // Computed: riwayat ujian selesai
  const completedExams = computed(() => {
    return exams.value.filter((exam) => exam.status === 'completed')
  })

  // Fungsi untuk verifikasi token
  const verifyToken = async (examId, token) => {
    try {
      const response = await ExamService.verifyToken(currentUserId.value, examId, token)
      return response.data.valid // true/false
    } catch (err) {
      console.error(err)
      throw err
      // $q.notify({
      //   type: 'negative',
      //   message: 'Token tidak valid atau sudah kadaluarsa',
      //   position: 'top',
      // })
      // return false
    }
  }

  // // Panggil fetch otomatis saat composable digunakan
  // onMounted(() => {
  //   fetchExams()
  // })

  return {
    loading,
    exams,
    activeExams,
    completedExams,
    fetchExams,
    verifyToken,
  }
}
