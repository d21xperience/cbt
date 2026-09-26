// src/mocks/handlers/subjectsHandlers.js
import { mockSubjects, mockSubjectsTemplateCSV } from '../data/subjectsData'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

let subjects = cloneMock(mockSubjects)

export const resetSubjectsMockData = () => {
  subjects = cloneMock(mockSubjects)
}

const validatePayload = (body) => {
  if (!body.kode || !body.nama || !body.nama_singkat) {
    return { error: 'validation_failed', message: 'kode, nama, nama_singkat wajib' }
  }
  if (!body.kelompok) {
    return { error: 'validation_failed', message: 'kelompok wajib' }
  }
  if (!body.tingkat) {
    return { error: 'validation_failed', message: 'tingkat wajib' }
  }
  if (body.kelompok === 'KEJURUAN' && !body.jurusan_id) {
    return { error: 'validation_failed', message: 'jurusan wajib untuk kelompok KEJURUAN' }
  }
  return null
}

export const subjectsHandlers = (mock) => {
  // ── Template download
  mock.onGet('/admin/subjects/template').reply(() => {
    console.info('[MOCK] GET /admin/subjects/template')
    const blob = new Blob([mockSubjectsTemplateCSV], { type: 'text/csv;charset=utf-8' })
    return [200, blob, { delay: DELAY }]
  })

  // ── List
  mock.onGet('/admin/subjects').reply(() => {
    return [
      200,
      { status: 'ok', data: cloneMock(subjects), count: subjects.length },
      { delay: DELAY },
    ]
  })

  // ── Create
  mock.onPost('/admin/subjects').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] POST /admin/subjects →', body.kode)

    const err = validatePayload(body)
    if (err) return [400, err, { delay: DELAY }]

    if (subjects.find((s) => s.kode.toLowerCase() === body.kode.toLowerCase())) {
      return [
        409,
        { error: 'kode_taken', message: `Kode '${body.kode}' sudah dipakai` },
        { delay: DELAY },
      ]
    }

    const newSubject = {
      id: `sub-${Date.now()}`,
      kode: body.kode,
      nama: body.nama,
      nama_singkat: body.nama_singkat,
      kelompok: body.kelompok,
      tingkat: body.tingkat,
      jurusan_id: body.kelompok === 'KEJURUAN' ? body.jurusan_id : null,
    }
    subjects.push(newSubject)
    return [201, { status: 'ok', data: newSubject }, { delay: DELAY }]
  })

  // ── Update
  mock.onPut(/\/admin\/subjects\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/admin\/subjects\/([^/]+)/)[1]
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] PUT /admin/subjects/:id →', id)

    const idx = subjects.findIndex((s) => s.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    const err = validatePayload(body)
    if (err) return [400, err, { delay: DELAY }]

    if (body.kode) {
      const dup = subjects.find(
        (s) => s.id !== id && s.kode.toLowerCase() === body.kode.toLowerCase(),
      )
      if (dup)
        return [
          409,
          { error: 'kode_taken', message: `Kode '${body.kode}' sudah dipakai` },
          { delay: DELAY },
        ]
    }

    subjects[idx] = {
      ...subjects[idx],
      ...body,
      id,
      jurusan_id: body.kelompok === 'KEJURUAN' ? body.jurusan_id : null,
    }
    return [200, { status: 'ok', data: subjects[idx] }, { delay: DELAY }]
  })

  // ── Delete
  mock.onDelete(/\/admin\/subjects\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/admin\/subjects\/([^/]+)/)[1]
    console.info('[MOCK] DELETE /admin/subjects/:id →', id)

    const idx = subjects.findIndex((s) => s.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    // Guard: KKA-10 dianggap "in use" untuk test negative
    if (subjects[idx].kode === 'KKA-10') {
      return [
        409,
        { error: 'subject_in_use', message: 'Mapel masih dipakai di pembelajaran.' },
        { delay: DELAY },
      ]
    }

    subjects.splice(idx, 1)
    return [200, { status: 'ok' }, { delay: DELAY }]
  })

  // ── Import
  mock.onPost('/admin/subjects/import').reply((config) => {
    const params = config.params || {}
    const isPreview = params.preview === 'true' || params.preview === true
    console.info('[MOCK] POST /admin/subjects/import preview=', isPreview)

    if (isPreview) {
      const preview = [
        {
          _rowNumber: 1,
          kode: 'BIN-10',
          nama: 'Bahasa Indonesia',
          nama_singkat: 'B.IND',
          kelompok: 'WAJIB',
          tingkat: '10',
          jurusan_kode: null,
          _error: null,
        },
        {
          _rowNumber: 2,
          kode: 'MTK-10',
          nama: 'Matematika',
          nama_singkat: 'MTK',
          kelompok: 'WAJIB',
          tingkat: '10',
          jurusan_kode: null,
          _error: null,
        },
        {
          _rowNumber: 3,
          kode: '',
          nama: 'Tanpa Kode',
          nama_singkat: '',
          kelompok: 'WAJIB',
          tingkat: '10',
          jurusan_kode: null,
          _error: 'Kode wajib',
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
      if (!r.kode || !r.nama) return
      if (subjects.find((s) => s.kode.toLowerCase() === r.kode.toLowerCase())) return
      subjects.push({
        id: `sub-${Date.now()}-${imported}`,
        kode: r.kode,
        nama: r.nama,
        nama_singkat: r.nama_singkat || '',
        kelompok: r.kelompok || 'WAJIB',
        tingkat: r.tingkat || '10',
        jurusan_id: r.kelompok === 'KEJURUAN' ? r.jurusan_kode || null : null,
      })
      imported += 1
    })
    return [200, { status: 'ok', imported_count: imported }, { delay: DELAY }]
  })
}
