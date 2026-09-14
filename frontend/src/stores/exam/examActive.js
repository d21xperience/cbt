import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/boot/axios'
import { Notify } from 'quasar'
import { initProctoring, cleanupProctoring } from '@/utils/proctoring'

export const useExamActiveStore = defineStore('examActive', () => {
  // State
  const activeQuestions = ref([])
  const activeIndex = ref(0)
  const localAnswers = ref(JSON.parse(localStorage.getItem('cbt_draft_answers')) || {})
  const secondsLeft = ref(0)
  const isSubmitting = ref(false)
  const isFinished = ref(false)

  // Proctoring States
  const proctoringActive = ref(false)
  const totalWarnings = ref(0)
  const isFullscreen = ref(false)

  let heartbeatId = null
  let timerId = null

  // Getters
  const currentQuestion = computed(() => activeQuestions.value[activeIndex.value] || null)
  const answeredCount = computed(() => Object.keys(localAnswers.value).length)

  // Actions
  const startExam = async () => {
    try {
      const res = await api.post('/exam/start')
      activeQuestions.value = res.data.questions
      secondsLeft.value = res.data.duration_seconds || 3600

      startTimer()
      startHeartbeat()
      activateProctoring()
    } catch (error) {
      console.error('Gagal memulai ujian:', error)
      throw error
    }
  }

  const startTimer = () => {
    timerId = setInterval(() => {
      if (secondsLeft.value > 0) {
        secondsLeft.value--
      } else {
        submitExamResponse(true)
      }
    }, 1000)
  }

  const startHeartbeat = () => {
    heartbeatId = setInterval(async () => {
      try {
        await api.post('/exam/heartbeat')
      } catch (e) {
        if (e.response?.status === 403) handleBannedSiswa()
      }
    }, 10000)
  }

  const activateProctoring = () => {
    if (proctoringActive.value) return
    proctoringActive.value = true

    initProctoring((eventType) => {
      sendTelemetry(eventType)
    })
  }

  const sendTelemetry = async (type) => {
    try {
      const res = await api.post('/exam/telemetry', { event_type: type })
      if (res.data.action === 'FORCE_SUBMIT') {
        await submitExamResponse(true)
      } else if (res.data.action === 'WARN') {
        totalWarnings.value++
      }
    } catch (err) {
      console.warn('Gagal kirim telemetri', err)
    }
  }

  const handleBannedSiswa = () => {
    clearInterval(timerId)
    clearInterval(heartbeatId)
    cleanupProctoring()
    Notify.create({ type: 'negative', message: 'Anda dikeluarkan dari ujian.' })
    setTimeout(() => {
      window.location.href = '/login'
    }, 3000)
  }

  // eslint-disable-next-line no-unused-vars
  const submitExamResponse = async (isAuto = false) => {
    if (isSubmitting.value || isFinished.value) return
    isSubmitting.value = true
    try {
      await api.post('/exam/submit')
      isFinished.value = true
      clearInterval(timerId)
      clearInterval(heartbeatId)
      cleanupProctoring()
    } catch (err) {
      console.log(err)
      isSubmitting.value = false
    }
  }

  return {
    activeQuestions,
    activeIndex,
    localAnswers,
    secondsLeft,
    isFinished,
    totalWarnings,
    isFullscreen,
    currentQuestion,
    answeredCount,
    startExam,
    submitExamResponse,
  }
})
