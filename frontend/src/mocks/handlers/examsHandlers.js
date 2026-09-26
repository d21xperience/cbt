// src/mocks/handlers/examsHandlers.js
import { mockExamsFull } from '../data/examsData'
import { mockExamTypes } from '../data/examTypesData'
import { mockSubjects } from '../data/subjectsData'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

let exams = cloneMock(mockExamsFull)

export const resetExamsMockData = () => {
  exams = cloneMock(mockExamsFull)
}

const deriveJurusanNama = (jurusanId) => {
  if (!jurusanId) return null
  // hardcode demo — ref ke program keahlian (mock)
  const map = { 'prog-tkj': 'TKJ', 'prog-rpl': 'RPL', 'prog-akl': 'AKL' }
  return map[jurusanId] || jurusanId
}

export const examsHandlers = (mock) => {
  // GET /admin/exams — list lengkap
  mock.onGet('/admin/exams').reply((config) => {
    const { class_id, jenis_ujian_id } = config.params || {}
    let list = cloneMock(exams)
    if (class_id) list = list.filter((e) => e.class_id === class_id)
    if (jenis_ujian_id) list = list.filter((e) => e.jenis_ujian_id === jenis_ujian_id)
    return [200, { status: 'ok', data: list, count: list.length }, { delay: DELAY }]
  })

  // POST /admin/exams/find-or-create
  mock.onPost('/admin/exams/find-or-create').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] POST /admin/exams/find-or-create →', body)

    const {
      jenis_ujian_id,
      subject_id,
      tingkat,
      jurusan_id,
      academic_year,
      semester,
      custom_nama,
    } = body

    if (!jenis_ujian_id || !subject_id || !tingkat) {
      return [
        400,
        { error: 'validation_failed', message: 'jenis_ujian_id, subject_id, tingkat wajib' },
        { delay: DELAY },
      ]
    }

    // ── Find existing by exact combination
    const existing = exams.find(
      (e) =>
        e.jenis_ujian_id === jenis_ujian_id &&
        e.subject_id === subject_id &&
        e.tingkat === tingkat &&
        (e.jurusan_id || null) === (jurusan_id || null) &&
        e.academic_year === academic_year &&
        e.semester === semester,
    )

    if (existing) {
      console.info('[MOCK] exam found existing →', existing.id)
      return [200, { status: 'ok', created: false, data: cloneMock(existing) }, { delay: DELAY }]
    }

    // ── Build nama
    const jt = mockExamTypes.find((t) => t.id === jenis_ujian_id)
    const subj = mockSubjects.find((s) => s.id === subject_id)
    let nama = String(custom_nama || '').trim()

    if (!nama) {
      const parts = [jt?.kode || 'UJIAN', subj?.nama || 'Mapel', tingkat]
      if (jurusan_id) parts[parts.length - 1] += `-${deriveJurusanNama(jurusan_id)}`
      nama = parts.join(' ')
    }

    // ── Auto-append nomor kalau duplicate nama
    const sameName = exams.filter((e) => e.nama === nama || e.nama.startsWith(`${nama} (`))
    if (sameName.length > 0) {
      nama = `${nama} (${sameName.length + 1})`
    }

    // ── Create
    const newExam = {
      id: `exam-${Date.now()}`,
      nama,
      jenis_ujian_id,
      jenis_ujian_kode: jt?.kode || null,
      subject_id,
      subject_kode: subj?.kode || null,
      subject_nama: subj?.nama || null,
      tingkat,
      jurusan_id: jurusan_id || null,
      jurusan_nama: jurusan_id ? deriveJurusanNama(jurusan_id) : null,
      academic_year: academic_year || '2025/2026',
      semester: semester || 'GANJIL',
      total_questions: 0,
      status: 'DRAFT',
      created_at: new Date().toISOString(),
    }
    exams.push(newExam)
    console.info('[MOCK] exam created →', newExam.id, newExam.nama)
    return [201, { status: 'ok', created: true, data: newExam }, { delay: DELAY }]
  })

  // DELETE /admin/exams/:id
  mock.onDelete(/\/admin\/exams\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/admin\/exams\/([^/]+)/)[1]
    console.info('[MOCK] DELETE /admin/exams/:id →', id)
    const idx = exams.findIndex((e) => e.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    if (exams[idx].total_questions > 0) {
      return [
        409,
        { error: 'exam_has_questions', message: 'Ujian masih memiliki soal.' },
        { delay: DELAY },
      ]
    }
    exams.splice(idx, 1)
    return [200, { status: 'ok' }, { delay: DELAY }]
  })
}
