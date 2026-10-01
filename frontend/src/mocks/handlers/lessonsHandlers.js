// src/mocks/handlers/lessonsHandlers.js
// Handler Master Pembelajaran — tenant-aware

import { getLessonsByTenant, mockLessonsTemplateCSV } from '../data/lessonsData'
import { getSubjectsByTenant } from '../data/subjectsData'
import { getClassesByTenant } from '../data/classesData'
import { getTeachersByTenant } from '../data/teachersData'
import { resolveTenant } from '../data/tenantHelpers'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

const lessonsStore = {}

const ensureStore = (tenant) => {
  if (!lessonsStore[tenant]) {
    lessonsStore[tenant] = cloneMock(getLessonsByTenant(tenant))
  }
  return lessonsStore[tenant]
}

export const resetLessonsMockData = () => {
  Object.keys(lessonsStore).forEach((k) => delete lessonsStore[k])
}

// ── Enrich: derive nama dari ref ids (per tenant)
const enrich = (tenant, lesson) => {
  const subjects = getSubjectsByTenant(tenant)
  const classes = getClassesByTenant(tenant)
  const teachers = getTeachersByTenant(tenant)

  const subject = subjects.find((s) => s.id === lesson.subject_id)
  const cls = classes.find((c) => c.id === lesson.class_id)
  const tch = teachers.find((t) => t.id === lesson.teacher_id)

  return {
    ...lesson,
    subject_kode: subject?.kode || lesson.subject_kode || null,
    subject_nama: subject?.nama || lesson.subject_nama || null,
    class_nama: cls?.nama || lesson.class_nama || null,
    teacher_nama: tch?.nama || lesson.teacher_nama || null,
  }
}

export const lessonsHandlers = (mock) => {
  // Template
  mock.onGet('/admin/lessons/template').reply(() => {
    const blob = new Blob([mockLessonsTemplateCSV], { type: 'text/csv;charset=utf-8' })
    return [200, blob, { delay: DELAY }]
  })

  // List
  mock.onGet('/admin/lessons').reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const data = cloneMock(store).map((l) => enrich(tenant, l))
    return [200, { status: 'ok', data, count: data.length }, { delay: DELAY }]
  })

  // Create
  mock.onPost('/admin/lessons').reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const body = JSON.parse(config.data || '{}')
    console.info(
      `[MOCK] POST /admin/lessons [${tenant}] → subject ${body.subject_id} class ${body.class_id}`,
    )

    if (!body.subject_id || !body.class_id || !body.teacher_id) {
      return [
        400,
        { error: 'validation_failed', message: 'subject_id, class_id, teacher_id wajib' },
        { delay: DELAY },
      ]
    }

    const dup = store.find(
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
      id: `lsn-${tenant}-${Date.now()}`,
      subject_id: body.subject_id,
      class_id: body.class_id,
      teacher_id: body.teacher_id,
      academic_year: body.academic_year || '2025/2026',
      semester: body.semester || 'GANJIL',
      tenant_slug: tenant,
    }
    store.unshift(newLesson)
    return [201, { status: 'ok', data: enrich(tenant, newLesson) }, { delay: DELAY }]
  })

  // Update
  mock.onPut(/\/admin\/lessons\/([^/]+)/).reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const id = config.url.match(/\/admin\/lessons\/([^/]+)/)[1]
    const body = JSON.parse(config.data || '{}')
    console.info(`[MOCK] PUT /admin/lessons/:id [${tenant}] →`, id)

    const idx = store.findIndex((l) => l.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    store[idx] = { ...store[idx], ...body, id }
    return [200, { status: 'ok', data: enrich(tenant, store[idx]) }, { delay: DELAY }]
  })

  // Delete
  mock.onDelete(/\/admin\/lessons\/([^/]+)/).reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const id = config.url.match(/\/admin\/lessons\/([^/]+)/)[1]
    console.info(`[MOCK] DELETE /admin/lessons/:id [${tenant}] →`, id)

    const idx = store.findIndex((l) => l.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    store.splice(idx, 1)
    return [200, { status: 'ok' }, { delay: DELAY }]
  })

  // Import
  mock.onPost('/admin/lessons/import').reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const subjects = getSubjectsByTenant(tenant)
    const classes = getClassesByTenant(tenant)
    const teachers = getTeachersByTenant(tenant)

    const params = config.params || {}
    const isPreview = params.preview === 'true' || params.preview === true
    console.info(`[MOCK] POST /admin/lessons/import [${tenant}] preview=`, isPreview)

    if (isPreview) {
      const preview = [
        {
          _rowNumber: 1,
          mapel_kode: 'MTK-10',
          kelas_nama: classes[0]?.nama || '10 IPA 1',
          guru_username: teachers[0]?.username || 'mira',
          academic_year: '2025/2026',
          semester: 'GANJIL',
          _error: null,
        },
        {
          _rowNumber: 2,
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
      const subj = subjects.find((s) => s.kode.toLowerCase() === r.mapel_kode.toLowerCase())
      const cls = classes.find((c) => c.nama.toLowerCase() === r.kelas_nama.toLowerCase())
      const tch = teachers.find((t) => t.username.toLowerCase() === r.guru_username.toLowerCase())
      if (!subj || !cls || !tch) return

      store.unshift({
        id: `lsn-${tenant}-${Date.now()}-${imported}`,
        subject_id: subj.id,
        class_id: cls.id,
        teacher_id: tch.id,
        academic_year: r.academic_year || '2025/2026',
        semester: r.semester || 'GANJIL',
        tenant_slug: tenant,
      })
      imported += 1
    })
    return [200, { status: 'ok', imported_count: imported }, { delay: DELAY }]
  })
}
