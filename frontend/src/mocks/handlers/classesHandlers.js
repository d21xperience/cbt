// src/mocks/handlers/classesHandlers.js
// Handler CRUD kelas — tenant-aware.
import { getClassesByTenant, mockClassesTemplateCSV } from '../data/classesData'
import { getTeachersByTenant } from '../data/teachersData'
import { getRoomsByTenant } from '../data/roomsData'
import { resolveTenant } from '../data/tenantHelpers'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

const classesStore = {}

const ensureStore = (tenant) => {
  if (!classesStore[tenant]) {
    classesStore[tenant] = cloneMock(getClassesByTenant(tenant))
  }
  return classesStore[tenant]
}

export const resetClassesMockData = () => {
  Object.keys(classesStore).forEach((k) => delete classesStore[k])
}

const deriveWaliNama = (tenant, waliId) => {
  if (!waliId) return null
  const t = getTeachersByTenant(tenant).find((x) => x.id === waliId)
  return t ? t.nama : null
}

const deriveRuangNama = (tenant, ruangId) => {
  if (!ruangId) return null
  const r = getRoomsByTenant(tenant).find((x) => x.id === ruangId)
  return r ? r.nama : null
}

export const classesHandlers = (mock) => {
  // Template download
  mock.onGet('/admin/classes/template').reply(() => {
    const blob = new Blob([mockClassesTemplateCSV], { type: 'text/csv;charset=utf-8' })
    return [200, blob, { delay: DELAY }]
  })

  // List
  mock.onGet('/admin/classes').reply((config) => {
    const tenant = resolveTenant(config)
    const list = ensureStore(tenant)
    return [200, { status: 'ok', data: cloneMock(list), count: list.length }, { delay: DELAY }]
  })

  // Create
  mock.onPost('/admin/classes').reply((config) => {
    const tenant = resolveTenant(config)
    const body = JSON.parse(config.data || '{}')
    const store = ensureStore(tenant)
    console.info(`[MOCK] POST /admin/classes [${tenant}] →`, body.nama)

    if (!body.nama || !body.tingkat) {
      return [
        400,
        { error: 'validation_failed', message: 'nama & tingkat wajib' },
        { delay: DELAY },
      ]
    }
    if (store.find((c) => c.nama.toLowerCase() === body.nama.toLowerCase())) {
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
      wali_kelas_nama: deriveWaliNama(tenant, body.wali_kelas_id),
      jumlah_siswa: 0,
      ruang_id: body.ruang_id || null,
      ruang_nama: deriveRuangNama(tenant, body.ruang_id),
      tenant_slug: tenant,
    }
    store.unshift(newClass)
    return [201, { status: 'ok', data: newClass }, { delay: DELAY }]
  })

  // Update
  mock.onPut(/\/admin\/classes\/([^/]+)/).reply((config) => {
    const tenant = resolveTenant(config)
    const id = config.url.match(/\/admin\/classes\/([^/]+)/)[1]
    const body = JSON.parse(config.data || '{}')
    const store = ensureStore(tenant)
    console.info(`[MOCK] PUT /admin/classes/:id [${tenant}] →`, id)

    const idx = store.findIndex((c) => c.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    if (body.nama) {
      const dup = store.find((c) => c.id !== id && c.nama.toLowerCase() === body.nama.toLowerCase())
      if (dup) return [409, { error: 'nama_taken' }, { delay: DELAY }]
    }

    store[idx] = {
      ...store[idx],
      ...body,
      id,
      wali_kelas_nama: deriveWaliNama(tenant, body.wali_kelas_id ?? store[idx].wali_kelas_id),
      ruang_nama: deriveRuangNama(tenant, body.ruang_id ?? store[idx].ruang_id),
    }
    return [200, { status: 'ok', data: store[idx] }, { delay: DELAY }]
  })

  // Delete
  mock.onDelete(/\/admin\/classes\/([^/]+)/).reply((config) => {
    const tenant = resolveTenant(config)
    const id = config.url.match(/\/admin\/classes\/([^/]+)/)[1]
    const store = ensureStore(tenant)
    console.info(`[MOCK] DELETE /admin/classes/:id [${tenant}] →`, id)

    const idx = store.findIndex((c) => c.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    if ((store[idx].jumlah_siswa || 0) > 0) {
      return [
        409,
        { error: 'class_has_students', message: 'Kelas masih memiliki siswa.' },
        { delay: DELAY },
      ]
    }

    store.splice(idx, 1)
    return [200, { status: 'ok' }, { delay: DELAY }]
  })

  // Import
  mock.onPost('/admin/classes/import').reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const params = config.params || {}
    const isPreview = params.preview === 'true' || params.preview === true
    console.info(`[MOCK] POST /admin/classes/import [${tenant}] preview=`, isPreview)

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
      if (store.find((c) => c.nama.toLowerCase() === r.nama.toLowerCase())) return

      store.unshift({
        id: `cls-${Date.now()}-${imported}`,
        nama: r.nama,
        tingkat: r.tingkat,
        kurikulum: r.kurikulum || 'K13',
        jenis_rombel: r.jenis_rombel || 'REGULER',
        program_keahlian_id: null,
        wali_kelas_id: null,
        wali_kelas_nama: r.wali_kelas_nama || null,
        jumlah_siswa: 0,
        ruang_id: null,
        ruang_nama: null,
        tenant_slug: tenant,
      })
      imported += 1
    })
    return [200, { status: 'ok', imported_count: imported }, { delay: DELAY }]
  })
}
