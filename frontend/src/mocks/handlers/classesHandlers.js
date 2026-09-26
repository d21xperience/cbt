// src/mocks/handlers/classesHandlers.js
import { mockClasses, mockClassesTemplateCSV } from '../data/classesData'
import { mockTeachers } from '../data/teachersData' // ← FIX: pakai teachersData
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

let classes = cloneMock(mockClasses)

export const resetClassesMockData = () => {
  classes = cloneMock(mockClasses)
}

// ── FIX: derive wali nama dari mockTeachers (teachersData.js)
const deriveWaliNama = (waliId) => {
  if (!waliId) return null
  const t = mockTeachers.find((x) => x.id === waliId)
  return t ? t.nama : null
}

export const classesHandlers = (mock) => {
  // ── Template download
  mock.onGet('/admin/classes/template').reply(() => {
    console.info('[MOCK] GET /admin/classes/template')
    const blob = new Blob([mockClassesTemplateCSV], { type: 'text/csv;charset=utf-8' })
    return [200, blob, { delay: DELAY }]
  })

  // ── List
  mock.onGet('/admin/classes').reply(() => {
    return [
      200,
      { status: 'ok', data: cloneMock(classes), count: classes.length },
      { delay: DELAY },
    ]
  })

  // ── Create
  mock.onPost('/admin/classes').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] POST /admin/classes →', body.nama)

    if (!body.nama || !body.tingkat) {
      return [
        400,
        { error: 'validation_failed', message: 'nama & tingkat wajib' },
        { delay: DELAY },
      ]
    }
    if (classes.find((c) => c.nama.toLowerCase() === body.nama.toLowerCase())) {
      return [
        409,
        { error: 'nama_taken', message: `Kelas '${body.nama}' sudah ada` },
        { delay: DELAY },
      ]
    }

    const newClass = {
      id: `cls-${Date.now()}`,
      nama: body.nama,
      tingkat: body.tingkat,
      kurikulum: body.kurikulum || 'K13',
      jenis_rombel: body.jenis_rombel || 'REGULER',
      program_keahlian_id: body.program_keahlian_id || null,
      wali_kelas_id: body.wali_kelas_id || null,
      wali_kelas_nama: deriveWaliNama(body.wali_kelas_id),
      jumlah_siswa: 0,
    }
    classes.unshift(newClass)
    return [201, { status: 'ok', data: newClass }, { delay: DELAY }]
  })

  // ── Update
  mock.onPut(/\/admin\/classes\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/admin\/classes\/([^/]+)/)[1]
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] PUT /admin/classes/:id →', id)

    const idx = classes.findIndex((c) => c.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    if (body.nama) {
      const dup = classes.find(
        (c) => c.id !== id && c.nama.toLowerCase() === body.nama.toLowerCase(),
      )
      if (dup)
        return [
          409,
          { error: 'nama_taken', message: `Kelas '${body.nama}' sudah ada` },
          { delay: DELAY },
        ]
    }

    classes[idx] = {
      ...classes[idx],
      ...body,
      id,
      wali_kelas_nama: deriveWaliNama(body.wali_kelas_id ?? classes[idx].wali_kelas_id),
    }
    return [200, { status: 'ok', data: classes[idx] }, { delay: DELAY }]
  })

  // ── Delete
  mock.onDelete(/\/admin\/classes\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/admin\/classes\/([^/]+)/)[1]
    console.info('[MOCK] DELETE /admin/classes/:id →', id)

    const idx = classes.findIndex((c) => c.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    // Guard: jumlah_siswa > 0 tidak bisa hapus
    if ((classes[idx].jumlah_siswa || 0) > 0) {
      return [
        409,
        { error: 'class_has_students', message: 'Kelas masih memiliki siswa.' },
        { delay: DELAY },
      ]
    }

    classes.splice(idx, 1)
    return [200, { status: 'ok' }, { delay: DELAY }]
  })

  // ── Import
  mock.onPost('/admin/classes/import').reply((config) => {
    const params = config.params || {}
    const isPreview = params.preview === 'true' || params.preview === true

    console.info('[MOCK] POST /admin/classes/import preview=', isPreview)

    if (isPreview) {
      const preview = [
        {
          _rowNumber: 1,
          nama: '10 IPA 3',
          tingkat: '10',
          kurikulum: 'K13',
          jenis_rombel: 'REGULER',
          wali_kelas_nama: null,
          _error: null,
        },
        {
          _rowNumber: 2,
          nama: '10 IPS 1',
          tingkat: '10',
          kurikulum: 'K13',
          jenis_rombel: 'REGULER',
          wali_kelas_nama: null,
          _error: null,
        },
        {
          _rowNumber: 3,
          nama: 'XII RPL A',
          tingkat: '12',
          kurikulum: 'K13',
          jenis_rombel: 'REGULER',
          wali_kelas_nama: 'Siti Aminah',
          _error: null,
        },
        {
          _rowNumber: 4,
          nama: '',
          tingkat: '',
          kurikulum: '',
          jenis_rombel: '',
          wali_kelas_nama: null,
          _error: 'Nama & tingkat wajib',
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
      if (!r.nama || !r.tingkat) return
      if (classes.find((c) => c.nama.toLowerCase() === r.nama.toLowerCase())) return

      classes.unshift({
        id: `cls-${Date.now()}-${imported}`,
        nama: r.nama,
        tingkat: r.tingkat,
        kurikulum: r.kurikulum || 'K13',
        jenis_rombel: r.jenis_rombel || 'REGULER',
        program_keahlian_id: null,
        wali_kelas_id: null,
        wali_kelas_nama: r.wali_kelas_nama || null,
        jumlah_siswa: 0,
      })
      imported += 1
    })

    return [200, { status: 'ok', imported_count: imported }, { delay: DELAY }]
  })
}
