// src/mocks/handlers/teachersHandlers.js
// Handler CRUD guru — tenant-aware.
import { getTeachersByTenant, mockTeachersTemplateCSV } from '../data/teachersData'
import { getClassesByTenant } from '../data/classesData'
import { resolveTenant } from '../data/tenantHelpers'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

const teachersStore = {}

const ensureStore = (tenant) => {
  if (!teachersStore[tenant]) {
    teachersStore[tenant] = cloneMock(getTeachersByTenant(tenant))
  }
  return teachersStore[tenant]
}

export const resetTeachersMockData = () => {
  Object.keys(teachersStore).forEach((k) => delete teachersStore[k])
}

const deriveHomeroomClassName = (tenant, classId) => {
  if (!classId) return null
  const c = getClassesByTenant(tenant).find((x) => x.id === classId)
  return c ? c.nama : null
}

export const teachersHandlers = (mock) => {
  // Template
  mock.onGet('/admin/teachers/template').reply(() => {
    const blob = new Blob([mockTeachersTemplateCSV], { type: 'text/csv;charset=utf-8' })
    return [200, blob, { delay: DELAY }]
  })

  // List
  mock.onGet('/admin/teachers').reply((config) => {
    const tenant = resolveTenant(config)
    const list = ensureStore(tenant)
    return [200, { status: 'ok', data: cloneMock(list), count: list.length }, { delay: DELAY }]
  })

  // Create
  mock.onPost('/admin/teachers').reply((config) => {
    const tenant = resolveTenant(config)
    const body = JSON.parse(config.data || '{}')
    const store = ensureStore(tenant)
    console.info(`[MOCK] POST /admin/teachers [${tenant}] →`, body.nama)

    if (!body.nama || !body.username) {
      return [
        400,
        { error: 'validation_failed', message: 'nama & username wajib' },
        { delay: DELAY },
      ]
    }
    if (store.find((t) => t.username.toLowerCase() === body.username.toLowerCase())) {
      return [
        409,
        { error: 'username_taken', message: `Username '${body.username}' sudah dipakai` },
        { delay: DELAY },
      ]
    }

    const newTeacher = {
      id: `tch-${Date.now()}`,
      nip: body.nip || '',
      nama: body.nama,
      email: body.email || '',
      username: body.username,
      status: body.status || 'AKTIF',
      teaching_subject_ids: Array.isArray(body.teaching_subject_ids)
        ? body.teaching_subject_ids
        : [],
      is_homeroom: !!body.is_homeroom,
      homeroom_class_id: body.is_homeroom ? body.homeroom_class_id || null : null,
      homeroom_class_nama: body.is_homeroom
        ? deriveHomeroomClassName(tenant, body.homeroom_class_id)
        : null,
      tenant_slug: tenant,
    }
    store.unshift(newTeacher)
    return [201, { status: 'ok', data: newTeacher }, { delay: DELAY }]
  })

  // Update
  mock.onPut(/\/admin\/teachers\/([^/]+)/).reply((config) => {
    const tenant = resolveTenant(config)
    const id = config.url.match(/\/admin\/teachers\/([^/]+)/)[1]
    const body = JSON.parse(config.data || '{}')
    const store = ensureStore(tenant)
    console.info(`[MOCK] PUT /admin/teachers/:id [${tenant}] →`, id)

    const idx = store.findIndex((t) => t.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    if (body.username) {
      const dup = store.find(
        (t) => t.id !== id && t.username.toLowerCase() === body.username.toLowerCase(),
      )
      if (dup) return [409, { error: 'username_taken' }, { delay: DELAY }]
    }

    const updated = {
      ...store[idx],
      ...body,
      id,
      password: body.password || store[idx].password,
      teaching_subject_ids: Array.isArray(body.teaching_subject_ids)
        ? body.teaching_subject_ids
        : store[idx].teaching_subject_ids,
      is_homeroom: body.is_homeroom ?? store[idx].is_homeroom,
      homeroom_class_id: body.is_homeroom
        ? (body.homeroom_class_id ?? store[idx].homeroom_class_id)
        : null,
      homeroom_class_nama: body.is_homeroom
        ? deriveHomeroomClassName(tenant, body.homeroom_class_id ?? store[idx].homeroom_class_id)
        : null,
    }
    store[idx] = updated
    return [200, { status: 'ok', data: updated }, { delay: DELAY }]
  })

  // Delete
  mock.onDelete(/\/admin\/teachers\/([^/]+)/).reply((config) => {
    const tenant = resolveTenant(config)
    const id = config.url.match(/\/admin\/teachers\/([^/]+)/)[1]
    const store = ensureStore(tenant)
    console.info(`[MOCK] DELETE /admin/teachers/:id [${tenant}] →`, id)

    const idx = store.findIndex((t) => t.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    if (store[idx].is_homeroom) {
      return [
        409,
        { error: 'teacher_in_use', message: 'Guru masih menjabat sebagai Wali Kelas.' },
        { delay: DELAY },
      ]
    }

    store.splice(idx, 1)
    return [200, { status: 'ok' }, { delay: DELAY }]
  })

  // Import
  mock.onPost('/admin/teachers/import').reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const params = config.params || {}
    const isPreview = params.preview === 'true' || params.preview === true
    console.info(`[MOCK] POST /admin/teachers/import [${tenant}] preview=`, isPreview)

    if (isPreview) {
      const preview = [
        {
          _rowNumber: 1,
          nip: '198001012005012011',
          nama: 'Hendra Gunawan',
          email: `hendra@${tenant}.sch.id`,
          username: 'hendra',
          status: 'AKTIF',
          _error: null,
        },
        {
          _rowNumber: 2,
          nip: '198102022006012012',
          nama: 'Rina Wati',
          email: `rina@${tenant}.sch.id`,
          username: 'rina',
          status: 'AKTIF',
          _error: null,
        },
        {
          _rowNumber: 3,
          nip: '',
          nama: '',
          email: '',
          username: '',
          status: 'AKTIF',
          _error: 'Nama & username wajib',
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
      if (!r.nama || !r.username) return
      if (store.find((t) => t.username.toLowerCase() === r.username.toLowerCase())) return
      store.unshift({
        id: `tch-${Date.now()}-${imported}`,
        nip: r.nip || '',
        nama: r.nama,
        email: r.email || '',
        username: r.username,
        status: r.status || 'AKTIF',
        teaching_subject_ids: [],
        is_homeroom: false,
        homeroom_class_id: null,
        homeroom_class_nama: null,
        tenant_slug: tenant,
      })
      imported += 1
    })
    return [200, { status: 'ok', imported_count: imported }, { delay: DELAY }]
  })
}
