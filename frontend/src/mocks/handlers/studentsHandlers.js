// src/mocks/handlers/studentsHandlers.js
import { mockStudents, mockStudentsTemplateCSV } from '../data/studentsData'
import { mockClasses } from '../data/classesData'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

let students = cloneMock(mockStudents)

export const resetStudentsMockData = () => {
  students = cloneMock(mockStudents)
}

const deriveKelasNama = (kelasId) => {
  const c = mockClasses.find((x) => x.id === kelasId)
  return c ? c.nama : null
}

export const studentsHandlers = (mock) => {
  // Template
  mock.onGet('/admin/students/template').reply(() => {
    const blob = new Blob([mockStudentsTemplateCSV], { type: 'text/csv;charset=utf-8' })
    return [200, blob, { delay: DELAY }]
  })

  // List
  mock.onGet('/admin/students').reply(() => {
    return [
      200,
      { status: 'ok', data: cloneMock(students), count: students.length },
      { delay: DELAY },
    ]
  })

  // Create
  mock.onPost('/admin/students').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] POST /admin/students →', body.nama)

    if (!body.nisn || !body.nama || !body.kelas_id) {
      return [
        400,
        { error: 'validation_failed', message: 'nisn, nama, kelas_id wajib' },
        { delay: DELAY },
      ]
    }
    if (students.find((s) => s.nisn === body.nisn)) {
      return [
        409,
        { error: 'nisn_taken', message: `NISN '${body.nisn}' sudah terdaftar` },
        { delay: DELAY },
      ]
    }

    const newStudent = {
      id: `std-${Date.now()}`,
      nisn: body.nisn,
      nis: body.nis || '',
      nama: body.nama,
      jenis_kelamin: body.jenis_kelamin || 'L',
      tanggal_lahir: body.tanggal_lahir || '',
      kelas_id: body.kelas_id,
      kelas_nama: deriveKelasNama(body.kelas_id),
      status: body.status || 'AKTIF',
    }
    students.unshift(newStudent)
    return [201, { status: 'ok', data: newStudent }, { delay: DELAY }]
  })

  // Update
  mock.onPut(/\/admin\/students\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/admin\/students\/([^/]+)/)[1]
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] PUT /admin/students/:id →', id)

    const idx = students.findIndex((s) => s.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    if (body.nisn) {
      const dup = students.find((s) => s.id !== id && s.nisn === body.nisn)
      if (dup) return [409, { error: 'nisn_taken' }, { delay: DELAY }]
    }

    students[idx] = {
      ...students[idx],
      ...body,
      id,
      kelas_nama: deriveKelasNama(body.kelas_id ?? students[idx].kelas_id),
    }
    return [200, { status: 'ok', data: students[idx] }, { delay: DELAY }]
  })

  // Delete
  mock.onDelete(/\/admin\/students\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/admin\/students\/([^/]+)/)[1]
    console.info('[MOCK] DELETE /admin/students/:id →', id)

    const idx = students.findIndex((s) => s.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    students.splice(idx, 1)
    return [200, { status: 'ok' }, { delay: DELAY }]
  })

  // Import
  mock.onPost('/admin/students/import').reply((config) => {
    const params = config.params || {}
    const isPreview = params.preview === 'true' || params.preview === true
    console.info('[MOCK] POST /admin/students/import preview=', isPreview)

    if (isPreview) {
      const preview = [
        {
          _rowNumber: 1,
          nisn: '1234500101',
          nama: 'Rizky Pratama',
          jenis_kelamin: 'L',
          kelas_nama: '10 IPA 1',
          _error: null,
        },
        {
          _rowNumber: 2,
          nisn: '1234500102',
          nama: 'Sari Dewi',
          jenis_kelamin: 'P',
          kelas_nama: '10 IPA 1',
          _error: null,
        },
        {
          _rowNumber: 3,
          nisn: '',
          nama: 'Tanpa NISN',
          jenis_kelamin: 'L',
          kelas_nama: '',
          _error: 'NISN wajib',
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
      if (!r.nisn || !r.nama) return
      if (students.find((s) => s.nisn === r.nisn)) return

      // Cari kelas_id dari kelas_nama
      const cls = mockClasses.find(
        (c) => c.nama.toLowerCase() === (r.kelas_nama || '').toLowerCase(),
      )

      students.unshift({
        id: `std-${Date.now()}-${imported}`,
        nisn: r.nisn,
        nis: r.nis || '',
        nama: r.nama,
        jenis_kelamin: r.jenis_kelamin || 'L',
        tanggal_lahir: r.tanggal_lahir || '',
        kelas_id: cls?.id || null,
        kelas_nama: cls?.nama || null,
        status: 'AKTIF',
      })
      imported += 1
    })
    return [200, { status: 'ok', imported_count: imported }, { delay: DELAY }]
  })
}
