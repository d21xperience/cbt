// src/mocks/handlers/subjectsHandlers.js
// Handler CRUD mata pelajaran — tenant-aware.
// Catatan: base kurikulum nasional di-share, tapi state runtime per tenant.
import { getSubjectsByTenant, mockSubjectsTemplateCSV } from '../data/subjectsData'
import { resolveTenant } from '../data/tenantHelpers'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

const subjectsStore = {}

const ensureStore = (tenant) => {
  if (!subjectsStore[tenant]) {
    subjectsStore[tenant] = cloneMock(getSubjectsByTenant(tenant))
  }
  return subjectsStore[tenant]
}

export const resetSubjectsMockData = () => {
  Object.keys(subjectsStore).forEach((k) => delete subjectsStore[k])
}

const validatePayload = (body) => {
  if (!body.kode || !body.nama || !body.nama_singkat) {
    return { error: 'validation_failed', message: 'kode, nama, nama_singkat wajib' }
  }
  if (!body.kelompok) return { error: 'validation_failed', message: 'kelompok wajib' }
  if (!body.tingkat) return { error: 'validation_failed', message: 'tingkat wajib' }
  if (body.kelompok === 'KEJURUAN' && !body.jurusan_id) {
    return { error: 'validation_failed', message: 'jurusan wajib untuk kelompok KEJURUAN' }
  }
  return null
}

export const subjectsHandlers = (mock) => {
  // Template download
  mock.onGet('/admin/subjects/template').reply(() => {
    const blob = new Blob([mockSubjectsTemplateCSV], { type: 'text/csv;charset=utf-8' })
    return [200, blob, { delay: DELAY }]
  })

  // List
  mock.onGet('/admin/subjects').reply((config) => {
    const tenant = resolveTenant(config)
    const list = ensureStore(tenant)
    return [200, { status: 'ok', data: cloneMock(list), count: list.length }, { delay: DELAY }]
  })

  // Create
  mock.onPost('/admin/subjects').reply((config) => {
    const tenant = resolveTenant(config)
    const body = JSON.parse(config.data || '{}')
    const store = ensureStore(tenant)
    console.info(`[MOCK] POST /admin/subjects [${tenant}] →`, body.kode)

    const err = validatePayload(body)
    if (err) return [400, err, { delay: DELAY }]

    if (store.find((s) => s.kode.toLowerCase() === body.kode.toLowerCase())) {
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
      tenant_slug: tenant,
    }
    store.push(newSubject)
    return [201, { status: 'ok', data: newSubject }, { delay: DELAY }]
  })

  // Update
  mock.onPut(/\/admin\/subjects\/([^/]+)/).reply((config) => {
    const tenant = resolveTenant(config)
    const id = config.url.match(/\/admin\/subjects\/([^/]+)/)[1]
    const body = JSON.parse(config.data || '{}')
    const store = ensureStore(tenant)
    console.info(`[MOCK] PUT /admin/subjects/:id [${tenant}] →`, id)

    const idx = store.findIndex((s) => s.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    const err = validatePayload(body)
    if (err) return [400, err, { delay: DELAY }]

    if (body.kode) {
      const dup = store.find((s) => s.id !== id && s.kode.toLowerCase() === body.kode.toLowerCase())
      if (dup) return [409, { error: 'kode_taken' }, { delay: DELAY }]
    }

    store[idx] = {
      ...store[idx],
      ...body,
      id,
      jurusan_id: body.kelompok === 'KEJURUAN' ? body.jurusan_id : null,
    }
    return [200, { status: 'ok', data: store[idx] }, { delay: DELAY }]
  })

  // Delete
  mock.onDelete(/\/admin\/subjects\/([^/]+)/).reply((config) => {
    const tenant = resolveTenant(config)
    const id = config.url.match(/\/admin\/subjects\/([^/]+)/)[1]
    const store = ensureStore(tenant)
    console.info(`[MOCK] DELETE /admin/subjects/:id [${tenant}] →`, id)

    const idx = store.findIndex((s) => s.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    if (store[idx].kode === 'KKA-10') {
      return [
        409,
        { error: 'subject_in_use', message: 'Mapel masih dipakai di pembelajaran.' },
        { delay: DELAY },
      ]
    }

    store.splice(idx, 1)
    return [200, { status: 'ok' }, { delay: DELAY }]
  })

  // Import
  mock.onPost('/admin/subjects/import').reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const params = config.params || {}
    const isPreview = params.preview === 'true' || params.preview === true
    console.info(`[MOCK] POST /admin/subjects/import [${tenant}] preview=`, isPreview)

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
      if (store.find((s) => s.kode.toLowerCase() === r.kode.toLowerCase())) return
      store.push({
        id: `sub-${Date.now()}-${imported}`,
        kode: r.kode,
        nama: r.nama,
        nama_singkat: r.nama_singkat || '',
        kelompok: r.kelompok || 'WAJIB',
        tingkat: r.tingkat || '10',
        jurusan_id: r.kelompok === 'KEJURUAN' ? r.jurusan_kode || null : null,
        tenant_slug: tenant,
      })
      imported += 1
    })
    return [200, { status: 'ok', imported_count: imported }, { delay: DELAY }]
  })
}
