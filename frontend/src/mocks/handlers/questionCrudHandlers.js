// src/mocks/handlers/questionCrudHandlers.js
// CRUD soal per exam — Fase 2b-1.

import { mockQuestionsByExam } from '../data/questionsDetailData'
import { mockExamsFull } from '../data/examsData'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

// In-memory state: soal per exam
let questionsByExam = JSON.parse(JSON.stringify(mockQuestionsByExam))

export const resetQuestionCrudMockData = () => {
  questionsByExam = JSON.parse(JSON.stringify(mockQuestionsByExam))
}

const ensureExamKey = (examId) => {
  if (!questionsByExam[examId]) questionsByExam[examId] = []
}

const updateExamTotalQuestions = (examId) => {
  const exam = mockExamsFull.find((e) => e.id === examId)
  if (exam) exam.total_questions = (questionsByExam[examId] || []).length
}

export const questionCrudHandlers = (mock) => {
  // GET /admin/exams/:id
  mock.onGet(/\/admin\/exams\/([^/]+)$/).reply((config) => {
    const id = config.url.match(/\/admin\/exams\/([^/]+)$/)[1]
    const exam = mockExamsFull.find((e) => e.id === id)
    if (!exam) return [404, { error: 'exam_not_found' }, { delay: DELAY }]
    return [200, { status: 'ok', data: cloneMock(exam) }, { delay: DELAY }]
  })

  // GET /admin/questions?exam_id=X
  mock.onGet('/admin/questions').reply((config) => {
    const examId = config.params?.exam_id
    if (!examId) return [400, { error: 'exam_id_required' }, { delay: DELAY }]
    const list = questionsByExam[examId] || []
    return [200, { status: 'ok', data: cloneMock(list), count: list.length }, { delay: DELAY }]
  })

  // GET /admin/questions/:id
  mock.onGet(/\/admin\/questions\/([^/]+)$/).reply((config) => {
    const id = config.url.match(/\/admin\/questions\/([^/]+)$/)[1]
    const found = Object.values(questionsByExam)
      .flat()
      .find((q) => q.id === id)
    if (!found) return [404, { error: 'question_not_found' }, { delay: DELAY }]
    return [200, { status: 'ok', data: cloneMock(found) }, { delay: DELAY }]
  })

  // POST /admin/questions
  mock.onPost('/admin/questions').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    const examId = body.exam_id
    if (!examId) return [400, { error: 'exam_id_required' }, { delay: DELAY }]
    if (!body.question_text) return [400, { error: 'question_text_required' }, { delay: DELAY }]

    ensureExamKey(examId)
    const list = questionsByExam[examId]

    // Normalize options: array (baru) atau objek (legacy)
    const normalizedOptions = Array.isArray(body.options)
      ? body.options.map((o) => ({
          id: o.id || `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: o.text || '',
          media_url: o.media_url || null,
          is_correct: !!o.is_correct,
          is_other: !!o.is_other,
        }))
      : body.options || []

    const normalizedPairs = Array.isArray(body.pairs)
      ? body.pairs.map((p) => ({
          id: p.id || `pair-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          left: p.left || '',
          right: p.right || '',
        }))
      : []

    const normalizedStatements = Array.isArray(body.statements)
      ? body.statements.map((s) => ({
          id: s.id || `stmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: s.text || '',
          correct: !!s.correct,
        }))
      : []

    const normalizedAnswers = Array.isArray(body.accepted_answers)
      ? body.accepted_answers.map((a) => ({
          id: a.id || `ans-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: a.text || '',
        }))
      : []

    const normalizedTestCases = Array.isArray(body.test_cases)
      ? body.test_cases.map((tc) => ({
          id: tc.id || `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          input: tc.input || '',
          expected_output: tc.expected_output || '',
          is_hidden: !!tc.is_hidden,
        }))
      : []

    const normalizedHotspots = Array.isArray(body.hotspots)
      ? body.hotspots.map((h) => ({
          id: h.id || `hs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          x: Number(h.x) || 0,
          y: Number(h.y) || 0,
          radius: Number(h.radius) || 4,
          is_correct: !!h.is_correct,
          label: h.label || '',
        }))
      : []

    const newQ = {
      id: `q-${examId}-${Date.now()}`,
      exam_id: examId,
      number: list.length + 1,
      question_type: body.question_type || 'PG',
      question_text: body.question_text,
      options: normalizedOptions,
      pairs: body.question_type === 'MATCHING' ? normalizedPairs : [],
      statements: body.question_type === 'TRUE_FALSE' ? normalizedStatements : [],
      accepted_answers: body.question_type === 'SHORT_ANSWER' ? normalizedAnswers : [],
      language: body.question_type === 'CODING' ? body.language || 'javascript' : null,
      starter_code: body.question_type === 'CODING' ? body.starter_code || '' : '',
      test_cases: body.question_type === 'CODING' ? normalizedTestCases : [],
      image_url: body.question_type === 'HOTSPOT' ? body.image_url || '' : '',
      hotspots: body.question_type === 'HOTSPOT' ? normalizedHotspots : [],
      case_sensitive: body.question_type === 'SHORT_ANSWER' ? !!body.case_sensitive : false,
      trim_whitespace:
        body.question_type === 'SHORT_ANSWER' ? body.trim_whitespace !== false : true,
      correct_option: normalizedOptions.find((o) => o.is_correct)?.id || null,
      score: Number(body.score) || 10,
      media_url: body.media_url || null,
      rubric: body.rubric || null,
    }
    list.push(newQ)
    updateExamTotalQuestions(examId)
    console.info('[MOCK] POST /admin/questions → exam', examId, newQ.id)
    return [201, { status: 'ok', data: newQ }, { delay: DELAY }]
  })

  // PUT /admin/questions/:id
  mock.onPut(/\/admin\/questions\/([^/]+)$/).reply((config) => {
    const id = config.url.match(/\/admin\/questions\/([^/]+)$/)[1]
    const body = JSON.parse(config.data || '{}')

    let found = null
    for (const list of Object.values(questionsByExam)) {
      const q = list.find((x) => x.id === id)
      if (q) {
        found = q
        break
      }
    }
    if (!found) return [404, { error: 'question_not_found' }, { delay: DELAY }]

    // Normalize options
    let normalizedOptions = found.options
    if (body.options) {
      normalizedOptions = Array.isArray(body.options)
        ? body.options.map((o) => ({
            id: o.id || `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text: o.text || '',
            media_url: o.media_url || null,
            is_correct: !!o.is_correct,
            is_other: !!o.is_other,
          }))
        : body.options
    }

    const normalizedPairs = body.pairs
      ? body.pairs.map((p) => ({
          id: p.id || `pair-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          left: p.left || '',
          right: p.right || '',
        }))
      : found.pairs

    const normalizedStatements = body.statements
      ? body.statements.map((s) => ({
          id: s.id || `stmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: s.text || '',
          correct: !!s.correct,
        }))
      : found.statements

    const normalizedAnswers = body.accepted_answers
      ? body.accepted_answers.map((a) => ({
          id: a.id || `ans-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: a.text || '',
        }))
      : found.accepted_answers

    const t = body.question_type ?? found.question_type

    const normalizedTestCases = body.test_cases
      ? body.test_cases.map((tc) => ({
          id: tc.id || `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          input: tc.input || '',
          expected_output: tc.expected_output || '',
          is_hidden: !!tc.is_hidden,
        }))
      : found.test_cases

    const normalizedHotspots = body.hotspots
      ? body.hotspots.map((h) => ({
          id: h.id || `hs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          x: Number(h.x) || 0,
          y: Number(h.y) || 0,
          radius: Number(h.radius) || 4,
          is_correct: !!h.is_correct,
          label: h.label || '',
        }))
      : found.hotspots

    Object.assign(found, {
      question_type: t,
      question_text: body.question_text ?? found.question_text,
      options: normalizedOptions,
      pairs: t === 'MATCHING' ? normalizedPairs : [],
      statements: t === 'TRUE_FALSE' ? normalizedStatements : [],
      accepted_answers: t === 'SHORT_ANSWER' ? normalizedAnswers : [],
      language: t === 'CODING' ? body.language || found.language || 'javascript' : null,
      starter_code: t === 'CODING' ? (body.starter_code ?? found.starter_code ?? '') : '',
      test_cases: t === 'CODING' ? normalizedTestCases : [],
      image_url: t === 'HOTSPOT' ? (body.image_url ?? found.image_url ?? '') : '',
      hotspots: t === 'HOTSPOT' ? normalizedHotspots : [],
      case_sensitive: t === 'SHORT_ANSWER' ? !!body.case_sensitive : false,
      trim_whitespace: t === 'SHORT_ANSWER' ? body.trim_whitespace !== false : true,
      correct_option: Array.isArray(normalizedOptions)
        ? normalizedOptions.find((o) => o.is_correct)?.id || null
        : (body.correct_option ?? found.correct_option),
      score: body.score != null ? Number(body.score) : found.score,
      media_url: body.media_url ?? found.media_url,
      rubric: body.rubric ?? found.rubric,
    })
    console.info('[MOCK] PUT /admin/questions/:id →', id)
    return [200, { status: 'ok', data: cloneMock(found) }, { delay: DELAY }]
  })

  // DELETE /admin/questions/:id
  mock.onDelete(/\/admin\/questions\/([^/]+)$/).reply((config) => {
    const id = config.url.match(/\/admin\/questions\/([^/]+)$/)[1]
    for (const [examId, list] of Object.entries(questionsByExam)) {
      const idx = list.findIndex((x) => x.id === id)
      if (idx !== -1) {
        list.splice(idx, 1)
        list.forEach((q, i) => {
          q.number = i + 1
        })
        updateExamTotalQuestions(examId)
        console.info('[MOCK] DELETE /admin/questions/:id →', id)
        return [200, { status: 'ok' }, { delay: DELAY }]
      }
    }
    return [404, { error: 'question_not_found' }, { delay: DELAY }]
  })
}
