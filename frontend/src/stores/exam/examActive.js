// src/stores/exam/examActive.js
// PHASE 3: rewrite — fix binding, add batching, server timer, retry, offline queue
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Notify } from 'quasar'
import { ActiveExamService } from '@/services/exam/ActiveExamService'
import { initProctoring, cleanupProctoring } from '@/utils/proctoring'

const STORAGE_KEY = 'cbt_draft_answers'
const FLUSH_INTERVAL_MS = 15000 // 15 detik
const FLUSH_BATCH_THRESHOLD = 5 // atau saat 5 jawaban numpuk
const MAX_RETRY = 3
const RETRY_BACKOFF_MS = [1000, 2000, 4000]

export const useExamActiveStore = defineStore('examActive', () => {
  // ============ STATE ============
  const activeQuestions = ref([])
  const activeIndex = ref(0)
  const answers = ref(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {})
  const secondsLeft = ref(0)
  const currentExamName = ref('')
  const fullscreenEnabled = ref(false)
  const isSubmitting = ref(false)
  const isFinished = ref(false)
  const serverStatus = ref(null) // NOT_STARTED | ACTIVE | EXPIRED | SUBMITTED

  // Proctoring
  const proctoringActive = ref(false)
  const totalWarnings = ref(0)
  // Alias untuk kompatibilitas layout lama
  const timeLeft = computed(() => secondsLeft.value)

  // Timer display helpers
  const timerHours = computed(() => Math.floor(secondsLeft.value / 3600))
  const timerMinutes = computed(() => Math.floor((secondsLeft.value % 3600) / 60))
  const timerSeconds = computed(() => secondsLeft.value % 60)
  // Autosave internal
  const pendingQueue = ref([]) // queue jawaban belum terkirim
  const inFlight = ref(false)
  const clientSeq = ref(0)

  let timerId = null
  let flushId = null
  let heartbeatId = null

  // ============ GETTERS ============
  const currentQuestion = computed(() => activeQuestions.value[activeIndex.value] || null)
  const totalQuestions = computed(() => activeQuestions.value.length)
  const currentIndex = computed(() => activeIndex.value)
  const answeredCount = computed(() => Object.keys(answers.value).length)
  const progressPercentage = computed(() =>
    totalQuestions.value === 0 ? 0 : (answeredCount.value / totalQuestions.value) * 100,
  )
  const warnings = computed(() => totalWarnings.value)
  const questions = computed(() => activeQuestions.value)

  // ============ HELPERS ============
  const persistLocal = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers.value))
  }

  const enqueue = (questionId, answerText) => {
    clientSeq.value += 1
    pendingQueue.value.push({
      question_id: questionId,
      answer: answerText,
      client_seq: clientSeq.value,
    })
    if (pendingQueue.value.length >= FLUSH_BATCH_THRESHOLD) {
      flushPending()
    }
  }

  // ============ AUTOSAVE (BATCHING + RETRY) ============
  const flushPending = async (attempt = 0) => {
    if (inFlight.value) return
    if (pendingQueue.value.length === 0) return

    inFlight.value = true
    const snapshot = [...pendingQueue.value]
    const idempotencyKey = `${Date.now()}-${clientSeq.value}`

    try {
      await ActiveExamService.saveAnswersBatch(snapshot, idempotencyKey)
      // Sukses → hapus dari queue berdasarkan client_seq
      const sentSeqs = new Set(snapshot.map((x) => x.client_seq))
      pendingQueue.value = pendingQueue.value.filter((x) => !sentSeqs.has(x.client_seq))
    } catch (err) {
      const status = err.response?.status
      // 403 = timer expired → jangan retry
      if (status === 403) {
        serverStatus.value = 'EXPIRED'
        Notify.create({
          type: 'negative',
          message: 'Waktu ujian habis. Jawaban tidak dapat dikirim.',
        })
        return
      }
      // Retry dengan exponential backoff
      if (attempt < MAX_RETRY) {
        const delay = RETRY_BACKOFF_MS[attempt] || 4000
        setTimeout(() => flushPending(attempt + 1), delay)
      } else {
        Notify.create({
          type: 'warning',
          message: 'Koneksi tidak stabil. Jawaban disimpan lokal, akan dicoba lagi.',
        })
      }
    } finally {
      inFlight.value = false
    }
  }

  const startFlushLoop = () => {
    if (flushId) clearInterval(flushId)
    flushId = setInterval(() => flushPending(), FLUSH_INTERVAL_MS)
  }

  // ============ TIMER (SERVER AUTHORITATIVE) ============
  const syncTimer = async () => {
    try {
      const { data } = await ActiveExamService.getTimer()
      serverStatus.value = data.status
      secondsLeft.value = data.remaining_seconds || 0
      return data
    } catch (err) {
      if (err.response?.status === 403) {
        serverStatus.value = err.response.data?.status || 'EXPIRED'
        secondsLeft.value = err.response.data?.remaining_seconds || 0
      }
      return null
    }
  }

  const startCountdown = () => {
    if (timerId) clearInterval(timerId)
    timerId = setInterval(() => {
      if (secondsLeft.value > 0) secondsLeft.value -= 1
      if (secondsLeft.value <= 0) {
        submitExam(true)
      }
    }, 1000)
  }

  // ============ HEARTBEAT ============
  const startHeartbeat = () => {
    if (heartbeatId) clearInterval(heartbeatId)
    heartbeatId = setInterval(async () => {
      try {
        await ActiveExamService.heartbeat()
      } catch (e) {
        if (e.response?.status === 403) handleBanned()
      }
    }, 60000) // 60s (dari sebelumnya 10s)
  }

  // ============ ACTIONS ============
  const startExam = async () => {
    // 1. Cek timer dulu
    const t = await syncTimer()
    if (t?.status === 'NOT_STARTED') {
      throw new Error('Ujian belum dimulai.')
    }
    if (t?.status === 'EXPIRED') {
      throw new Error('Waktu ujian sudah habis.')
    }

    // 2. Fetch soal
    const { data } = await ActiveExamService.startExam()
    activeQuestions.value = data.questions || []
    currentExamName.value = data.exam_title || 'CBT Engine'
    secondsLeft.value = t?.remaining_seconds || data.remaining_seconds || 3600

    startCountdown()
    startFlushLoop()
    startHeartbeat()
    activateProctoring()
  }

  const saveAnswer = (questionId, answerText) => {
    answers.value[questionId] = answerText
    persistLocal()
    enqueue(questionId, answerText)
  }

  const activateProctoring = () => {
    if (proctoringActive.value) return
    proctoringActive.value = true
    initProctoring((eventType) => sendTelemetry(eventType))
  }

  const sendTelemetry = async (type) => {
    try {
      const { data } = await ActiveExamService.sendTelemetry(type)
      if (data.action === 'FORCE_SUBMIT') await submitExam(true)
      else if (data.action === 'WARN') totalWarnings.value += 1
    } catch (err) {
      // ignore telemetry errors — jangan ganggu UX
      void err
    }
  }

  const handleBanned = () => {
    stopAllLoops()
    cleanupProctoring()
    Notify.create({ type: 'negative', message: 'Anda dikeluarkan dari ujian.' })
    setTimeout(() => (window.location.href = '/auth/participant'), 3000)
  }

  const stopAllLoops = () => {
    if (timerId) clearInterval(timerId)
    if (flushId) clearInterval(flushId)
    if (heartbeatId) clearInterval(heartbeatId)
    timerId = flushId = heartbeatId = null
  }

  const submitExam = async () => {
    alert('helow')
    if (isSubmitting.value || isFinished.value) return
    isSubmitting.value = true
    await flushPending()
    try {
      await ActiveExamService.submitExam()
      isFinished.value = true
      stopAllLoops()
      cleanupProctoring()
      localStorage.removeItem(STORAGE_KEY)
    } catch (err) {
      if (err.response?.status === 403) {
        isFinished.value = true
        stopAllLoops()
        cleanupProctoring()
      } else {
        Notify.create({ type: 'negative', message: 'Gagal submit. Coba lagi.' })
        throw err // ← PENTING: re-throw agar handleSubmit catch bisa handle
      }
    } finally {
      isSubmitting.value = false
    }
  }

  const reset = () => {
    stopAllLoops()
    activeQuestions.value = []
    activeIndex.value = 0
    answers.value = {}
    secondsLeft.value = 0
    pendingQueue.value = []
    isFinished.value = false
    isSubmitting.value = false
    totalWarnings.value = 0
    localStorage.removeItem(STORAGE_KEY)
  }
  const enableFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
        fullscreenEnabled.value = true
      }
    } catch (e) {
      console.warn('Fullscreen failed:', e)
    }
  }

  const disableFullscreen = async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen()
        fullscreenEnabled.value = false
      }
    } catch (e) {
      console.warn('Exit fullscreen failed:', e)
    }
  }
  // ============ RETURN ============
  return {
    // state
    activeQuestions,
    activeIndex,
    answers,
    secondsLeft,
    isSubmitting,
    isFinished,
    serverStatus,
    proctoringActive,
    totalWarnings,
    // getters
    currentQuestion,
    currentIndex,
    totalQuestions,
    answeredCount,
    progressPercentage,
    warnings,
    questions,
    // actions
    startExam,
    saveAnswer,
    submitExam,
    syncTimer,
    reset,
    flushPending,
    enableFullscreen,
    disableFullscreen,
    timerHours,
    timerMinutes,
    timerSeconds,
    timeLeft,
    currentExamName,
    fullscreenEnabled,
  }
})

export const useExamStore = useExamActiveStore
