// src/mocks/handlers/lessonsHandlers.js
import { mockLessons, mockLessonsTemplateCSV } from '../data/lessonsData'
import { mockSubjects } from '../data/subjectsData'
import { mockClasses } from '../data/classesData'
import { mockTeachers } from '../data/teachersData'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

let lessons = cloneMock(mockLessons)

export const resetLessonsMockData = () => {
  lessons = cloneMock(mockLessons)
}

// Helper: derive nama dari ref ids
const enrich = (lesson) => {
  const subject = mockSubjects.find((s) => s.id === lesson.subject_id)
  const cls = mockClasses.find((c) => c.id === lesson.class_id)
  const tch = mockTeachers.find((t) => t.id === lesson.teacher_id)
  return {
    ...lesson,
    subject_kode: subject?.kode || null,
    subject_nama: subject?.nama || null,
    class_nama: cls?.nama || null,
    teacher_nama: tch?.nama || null,
  }
}

export const lessonsHandlers = (mock) => {
  // Template
  mock.onGet('/admin/lessons/template').reply(() => {
    const blob = new Blob([mockLessonsTemplateCSV], { type: 'text/csv;charset=utf-8' })
    return [200, blob, { delay: DELAY }]
  })

  // List
  mock.onGet('/admin/lessons').reply(() => {
    const data = cloneMock(lessons).map(enrich)
    return [200, { status: 'ok', data, count: data.length }, { delay: DELAY }]
  })

  // Create
  mock.onPost('/admin/lessons').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] POST /admin/lessons → subject', body.subject_id, 'class', body.class_id)

    if (!body.subject_id || !body.class_id || !body.teacher_id) {
      return [
        400,
        { error: 'validation_failed', message: 'subject_id, class_id, teacher_id wajib' },
        { delay: DELAY },
      ]
    }
    // Cek duplikat
    const dup = lessons.find(
      (l) =>
        l.subject_id === body.subject_id &&
        l.class_id === body.class_id &&
        l.academic_year === body.academic_year &&
        l.semester === body.semester,
    )
    if (dup) {
      return [
        409,
        { error: 'duplicate_lesson', message: 'Pembelajaran ini sudah ada' },
        { delay: DELAY },
      ]
    }

    const newLesson = {
      id: `lsn-${Date.now()}`,
      subject_id: body.subject_id,
      class_id: body.class_id,
      teacher_id: body.teacher_id,
      academic_year: body.academic_year || '2025/2026',
      semester: body.semester || 'GANJIL',
    }
    lessons.unshift(newLesson)
    return [201, { status: 'ok', data: enrich(newLesson) }, { delay: DELAY }]
  })

  // Update
  mock.onPut(/\/admin\/lessons\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/admin\/lessons\/([^/]+)/)[1]
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] PUT /admin/lessons/:id →', id)

    const idx = lessons.findIndex((l) => l.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    lessons[idx] = { ...lessons[idx], ...body, id }
    return [200, { status: 'ok', data: enrich(lessons[idx]) }, { delay: DELAY }]
  })

  // Delete
  mock.onDelete(/\/admin\/lessons\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/admin\/lessons\/([^/]+)/)[1]
    console.info('[MOCK] DELETE /admin/lessons/:id →', id)

    const idx = lessons.findIndex((l) => l.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    lessons.splice(idx, 1)
    return [200, { status: 'ok' }, { delay: DELAY }]
  })

  // Import
  mock.onPost('/admin/lessons/import').reply((config) => {
    const params = config.params || {}
    const isPreview = params.preview === 'true' || params.preview === true
    console.info('[MOCK] POST /admin/lessons/import preview=', isPreview)

    if (isPreview) {
      const preview = [
        {
          _rowNumber: 1,
          mapel_kode: 'MTK',
          kelas_nama: '10 IPA 1',
          guru_username: 'mira',
          academic_year: '2025/2026',
          semester: 'GANJIL',
          _error: null,
        },
        {
          _rowNumber: 2,
          mapel_kode: 'BIN',
          kelas_nama: '10 IPA 1',
          guru_username: 'fia',
          academic_year: '2025/2026',
          semester: 'GANJIL',
          _error: null,
        },
        {
          _rowNumber: 3,
          mapel_kode: 'XXX',
          kelas_nama: '99 ZZZ',
          guru_username: 'xxx',
          academic_year: '2025/2026',
          semester: 'GANJIL',
          _error: 'Mapel / kelas / guru tidak ditemukan',
        },
      ]
      return [200, { status: 'ok', data: preview, errors: [] }, { delay: DELAY }]
    }

    let body = {}
    try {
      body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {}
    } catch {
      return [400, { error: 'invalid_json' }, { delay: DELAY }]
    }

    const rows = Array.isArray(body.rows) ? body.rows : []
    let imported = 0
    rows.forEach((r) => {
      if (!r.mapel_kode || !r.kelas_nama || !r.guru_username) return
      const subj = mockSubjects.find((s) => s.kode.toLowerCase() === r.mapel_kode.toLowerCase())
      const cls = mockClasses.find((c) => c.nama.toLowerCase() === r.kelas_nama.toLowerCase())
      const tch = mockTeachers.find(
        (t) => t.username.toLowerCase() === r.guru_username.toLowerCase(),
      )
      if (!subj || !cls || !tch) return

      lessons.unshift({
        id: `lsn-${Date.now()}-${imported}`,
        subject_id: subj.id,
        class_id: cls.id,
        teacher_id: tch.id,
        academic_year: r.academic_year || '2025/2026',
        semester: r.semester || 'GANJIL',
      })
      imported += 1
    })
    return [200, { status: 'ok', imported_count: imported }, { delay: DELAY }]
  })
}
