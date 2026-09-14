// src/mocks/handlers/examHandlers.js
import {
  mockExamStart,
  mockAnswerSave,
  mockHeartbeat,
  mockTelemetry,
  mockSubmit,
  mockHistory,
  mockExams,
} from '../data/examdata'
// eslint-disable-next-line no-unused-vars
import { getWarningCount, incrementWarning, resetWarning } from '../data/stateStore'
const DELAY = 300
export const examHandlers = (mock) => {
  // Exam Start
  mock.onPost('/exams/start').reply(() => {
    resetWarning() // reset warning counter
    console.log(`📝 [MOCK] Exam started, questions loaded: ${mockExamStart.questions.length}`)
    return [200, mockExamStart]
  })

  // Save Answer
  mock.onPost('/exams/answer').reply((config) => {
    const body = JSON.parse(config.data)
    console.log(`💾 [MOCK] Jawaban tersimpan: ${body.question_id} = ${body.answer}`)
    return [200, mockAnswerSave]
  })

  // Heartbeat
  mock.onPost('/exams/heartbeat').reply(() => {
    console.log('❤️ [MOCK] Heartbeat OK')
    return [200, mockHeartbeat]
  })

  // Telemetry
  mock.onPost('/exams/telemetry').reply((config) => {
    const body = JSON.parse(config.data)
    const warning = incrementWarning()
    const response = mockTelemetry(body.event_type)
    if (warning >= 5) {
      response.action = 'FORCE_SUBMIT'
      response.reason = 'Terlalu banyak pelanggaran!'
    }
    console.log(
      `📡 [MOCK] Telemetry: ${body.event_type} → ${response.action} (warning #${warning})`,
    )
    return [200, response]
  })

  // Submit
  mock.onPost('/exams/submit').reply(() => {
    console.log('📬 [MOCK] Exam submitted')
    return [200, mockSubmit]
  })

  // Daftar ujian aktif
  mock.onGet('/exams/active').reply((config) => {
    // 1. Baca Tenant dari Header (dikirim otomatis oleh axios)
    const tenant = config.headers['X-Tenant-Slug'] || 'default'

    // 2. Baca Participant ID dari Query Param
    const participantId = config.params?.participant_id

    console.log(`📢 Mock Exam: Tenant=${tenant}, Participant=${participantId}`)

    // 3. Filter data mock berdasarkan Tenant DAN Participant ID
    const filteredExams = mockExams.filter(
      (exam) => exam.tenant === tenant && exam.participantId === participantId,
    )
    console.log(filteredExams)
    if (filteredExams.length === 0) {
      // Tetap return 200 dengan array kosong (bukan 404) agar UI menampilkan "Tidak ada ujian"
      return [200, [], { delay: DELAY }]
    }

    return [200, filteredExams, { delay: DELAY }]
  })

  // Riwayat ujian
  mock.onGet('/exams/history').reply(() => {
    return [200, mockHistory]
  })

  // Verifikasi token
  mock.onPost(/\/exams\/.+\/verify-token/).reply((config) => {
    const body = JSON.parse(config.data)
    const tenant = config.headers['X-Tenant-Slug']

    // Cari exam di mock data berdasarkan tenant, examId, dan participantId
    const exam = mockExams.find(
      (e) =>
        e.tenant === tenant && e.id === body.exam_id && e.participantId === body.participant_id,
    )

    if (exam && exam.token === body.token) {
      return [200, { valid: true }, { delay: DELAY }]
    }
    return [401, { valid: false, message: 'Token tidak valid' }, { delay: DELAY }]
  })
}
