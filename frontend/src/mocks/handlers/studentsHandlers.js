// src/mocks/handlers/studentsHandlers.js
// Handler CRUD siswa — tenant-aware (baca X-Tenant-Slug).
import { getClassesByTenant } from '../data/classesData'
import { cloneMock } from '../data/keahlianData'
import { getStudentsByTenant, mockStudentsTemplateCSV } from '../data/studentsData'
import { resolveTenant } from '../data/tenantHelpers'

const DELAY = 300

// ── Per-tenant store
const studentsStore = {} // { tenantA: [...], tenantB: [...] }

const ensureStore = (tenant) => {
  if (!studentsStore[tenant]) {
    studentsStore[tenant] = cloneMock(getStudentsByTenant(tenant))
  }
  return studentsStore[tenant]
}

export const resetStudentsMockData = () => {
  Object.keys(studentsStore).forEach((k) => delete studentsStore[k])
}

export const studentsHandlers = (mock) => {
  // Template
  mock.onGet('/admin/students/template').reply(() => {
    const blob = new Blob([mockStudentsTemplateCSV], { type: 'text/csv;charset=utf-8' })
    return [200, blob, { delay: DELAY }]
  })

  // List
  mock.onGet('/admin/students').reply((config) => {
    const tenant = resolveTenant(config)
    const list = ensureStore(tenant)
    return [200, { status: 'ok', data: cloneMock(list), count: list.length }, { delay: DELAY }]
  })

  // Create
  mock.onPost('/admin/students').reply((config) => {
    const tenant = resolveTenant(config)
    const body = JSON.parse(config.data || '{}')
    const store = ensureStore(tenant)
    const kelasList = getClassesByTenant(tenant)
    const cls = kelasList.find((c) => c.id === body.kelas_id)

    console.info(`[MOCK] POST /admin/students [${tenant}] →`, body.nama)

    if (!body.nisn || !body.nama || !body.kelas_id) {
      return [
        400,
        { error: 'validation_failed', message: 'nisn, nama, kelas_id wajib' },
        { delay: DELAY },
      ]
    }
    if (!cls) {
      return [
        400,
        { error: 'invalid_kelas', message: 'Kelas tidak ditemukan di tenant ini' },
        { delay: DELAY },
      ]
    }
    if (store.find((s) => s.nisn === body.nisn)) {
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
      kelas_nama: cls.nama,
      status: body.status || 'AKTIF',
      photo_url: null,
      tenant_slug: tenant,
    }
    store.unshift(newStudent)
    return [201, { status: 'ok', data: newStudent }, { delay: DELAY }]
  })

  // Update
  mock.onPut(/\/admin\/students\/([^/]+)/).reply((config) => {
    const tenant = resolveTenant(config)
    const id = config.url.match(/\/admin\/students\/([^/]+)/)[1]
    const body = JSON.parse(config.data || '{}')
    const store = ensureStore(tenant)
    console.info(`[MOCK] PUT /admin/students/:id [${tenant}] →`, id)

    const idx = store.findIndex((s) => s.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    if (body.nisn) {
      const dup = store.find((s) => s.id !== id && s.nisn === body.nisn)
      if (dup) return [409, { error: 'nisn_taken' }, { delay: DELAY }]
    }

    const kelasId = body.kelas_id ?? store[idx].kelas_id
    const cls = getClassesByTenant(tenant).find((c) => c.id === kelasId)

    store[idx] = {
      ...store[idx],
      ...body,
      id,
      kelas_id: kelasId,
      kelas_nama: cls ? cls.nama : store[idx].kelas_nama,
    }
    return [200, { status: 'ok', data: store[idx] }, { delay: DELAY }]
  })

  // Delete
  mock.onDelete(/\/admin\/students\/([^/]+)/).reply((config) => {
    const tenant = resolveTenant(config)
    const id = config.url.match(/\/admin\/students\/([^/]+)/)[1]
    const store = ensureStore(tenant)
    console.info(`[MOCK] DELETE /admin/students/:id [${tenant}] →`, id)

    const idx = store.findIndex((s) => s.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    store.splice(idx, 1)
    return [200, { status: 'ok' }, { delay: DELAY }]
  })

  // Import
  mock.onPost('/admin/students/import').reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const kelasList = getClassesByTenant(tenant)
    const params = config.params || {}
    const isPreview = params.preview === 'true' || params.preview === true
    console.info(`[MOCK] POST /admin/students/import [${tenant}] preview=`, isPreview)

    if (isPreview) {
      const sampleKelas = kelasList[0]?.nama || ''
      const preview = [
        {
          _rowNumber: 1,
          nisn: '1234500101',
          nama: 'Rizky Pratama',
          jenis_kelamin: 'L',
          kelas_nama: sampleKelas,
          _error: null,
        },
        {
          _rowNumber: 2,
          nisn: '1234500102',
          nama: 'Sari Dewi',
          jenis_kelamin: 'P',
          kelas_nama: sampleKelas,
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
      if (store.find((s) => s.nisn === r.nisn)) return

      const cls = kelasList.find((c) => c.nama.toLowerCase() === (r.kelas_nama || '').toLowerCase())

      store.unshift({
        id: `std-${Date.now()}-${imported}`,
        nisn: r.nisn,
        nis: r.nis || '',
        nama: r.nama,
        jenis_kelamin: r.jenis_kelamin || 'L',
        tanggal_lahir: r.tanggal_lahir || '',
        kelas_id: cls?.id || null,
        kelas_nama: cls?.nama || null,
        status: 'AKTIF',
        tenant_slug: tenant,
      })
      imported += 1
    })
    return [200, { status: 'ok', imported_count: imported }, { delay: DELAY }]
  })
}
