// src/mocks/handlers/examTypesHandlers.js
import { mockExamTypes, mockExamTypesTemplateCSV } from '../data/examTypesData'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

let examTypes = cloneMock(mockExamTypes)

export const resetExamTypesMockData = () => {
  examTypes = cloneMock(mockExamTypes)
}

export const examTypesHandlers = (mock) => {
  // Template
  mock.onGet('/admin/exam-types/template').reply(() => {
    const blob = new Blob([mockExamTypesTemplateCSV], { type: 'text/csv;charset=utf-8' })
    return [200, blob, { delay: DELAY }]
  })

  // List
  mock.onGet('/admin/exam-types').reply(() => {
    return [200, { status: 'ok', data: cloneMock(examTypes), count: examTypes.length }, { delay: DELAY }]
  })

  // Create
  mock.onPost('/admin/exam-types').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] POST /admin/exam-types →', body.kode)

    if (!body.kode || !body.nama) {
      return [400, { error: 'validation_failed', message: 'kode & nama wajib' }, { delay: DELAY }]
    }
    if (examTypes.find((t) => t.kode.toLowerCase() === body.kode.toLowerCase())) {
      return [409, { error: 'kode_taken', message: `Kode '${body.kode}' sudah ada` }, { delay: DELAY }]
    }

    const newType = {
      id: `etype-${Date.now()}`,
      kode: body.kode.toUpperCase(),
      nama: body.nama,
      deskripsi: body.deskripsi || '',
    }
    examTypes.push(newType)
    return [201, { status: 'ok', data: newType }, { delay: DELAY }]
  })

  // Update
  mock.onPut(/\/admin\/exam-types\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/admin\/exam-types\/([^/]+)/)[1]
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] PUT /admin/exam-types/:id →', id)

    const idx = examTypes.findIndex((t) => t.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    if (body.kode) {
      const dup = examTypes.find((t) => t.id !== id && t.kode.toLowerCase() === body.kode.toLowerCase())
      if (dup) return [409, { error: 'kode_taken', message: `Kode '${body.kode}' sudah ada` }, { delay: DELAY }]
    }

    examTypes[idx] = {
      ...examTypes[idx],
      ...body,
      id,
      kode: (body.kode || examTypes[idx].kode).toUpperCase(),
    }
    return [200, { status: 'ok', data: examTypes[idx] }, { delay: DELAY }]
  })

  // Delete
  mock.onDelete(/\/admin\/exam-types\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/admin\/exam-types\/([^/]+)/)[1]
    console.info('[MOCK] DELETE /admin/exam-types/:id →', id)

    const idx = examTypes.findIndex((t) => t.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    // Guard: UAS/UTS default tidak bisa dihapus (misal)
    if (['UAS', 'UTS'].includes(examTypes[idx].kode)) {
      return [
        409,
        { error: 'type_in_use', message: `Jenis ujian '${examTypes[idx].kode}' adalah default dan tidak dapat dihapus.` },
        { delay: DELAY },
      ]
    }

    examTypes.splice(idx, 1)
    return [200, { status: 'ok' }, { delay: DELAY }]
  })

  // Import
  mock.onPost('/admin/exam-types/import').reply((config) => {
    const params = config.params || {}
    const isPreview = params.preview === 'true' || params.preview === true
    console.info('[MOCK] POST /admin/exam-types/import preview=', isPreview)

    if (isPreview) {
      const preview = [
        { _rowNumber: 1, kode: 'PTS', nama: 'Penilaian Tengah Semester', deskripsi: 'PTS Kurikulum Merdeka', _error: null },
        { _rowNumber: 2, kode: 'PAS', nama: 'Penilaian Akhir Semester',  deskripsi: 'PAS Kurikulum Merdeka', _error: null },
        { _rowNumber: 3, kode: '',    nama: 'Tanpa Kode',                deskripsi: '',                       _error: 'Kode wajib' },
      ]
      return [200, { status: 'ok', data: preview, errors: [] }, { delay: DELAY }]
    }

    let body = {}
    try { body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {} }
    catch { return [400, { error: 'invalid_json' }, { delay: DELAY }] }

    const rows = Array.isArray(body.rows) ? body.rows : []
    let imported = 0
    rows.forEach((r) => {
      if (!r.kode || !r.nama) return
      if (examTypes.find((t) => t.kode.toLowerCase() === r.kode.toLowerCase())) return
      examTypes.push({
        id: `etype-${Date.now()}-${imported}`,
        kode: r.kode.toUpperCase(),
        nama: r.nama,
        deskripsi: r.deskripsi || '',
      })
      imported += 1
    })
    return [200, { status: 'ok', imported_count: imported }, { delay: DELAY }]
  })
}
