// src/mocks/handlers/examSchedulesHandlers.js
// Handler Jadwal Ujian — tenant-aware.

import { getSchedulesByTenant, getAllSchedules } from '../data/examSchedulesData'
import { resolveTenant } from '../data/tenantHelpers'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

const schedulesStore = {} // { tenant: [...] }

const ensureStore = (tenant) => {
  if (!schedulesStore[tenant]) {
    schedulesStore[tenant] = cloneMock(getSchedulesByTenant(tenant))
  }
  return schedulesStore[tenant]
}

export const resetExamSchedulesMockData = () => {
  Object.keys(schedulesStore).forEach((k) => delete schedulesStore[k])
}

// ── Backward-compat: getSchedules() flat (dipakai sessionsHandlers pre-F0.6c-3b)
export const getSchedules = () => {
  // Union semua tenant (kalau ada store yang sudah di-init, pakai itu)
  const fromStores = Object.values(schedulesStore).flat()
  if (fromStores.length > 0) return cloneMock(fromStores)
  return cloneMock(getAllSchedules())
}

// ── New: getSchedulesByTenant (dipakai sessionsHandlers post-F0.6c-3b)
export const getSchedulesForTenant = (tenant) => cloneMock(ensureStore(tenant))

export const examSchedulesHandlers = (mock) => {
  // ── LIST
  mock.onGet('/admin/exam-schedules').reply((config) => {
    const tenant = resolveTenant(config)
    const { jenis_ujian_id, tingkat, tanggal, search } = config.params || {}
    let list = cloneMock(ensureStore(tenant))

    if (jenis_ujian_id) list = list.filter((s) => s.jenis_ujian_id === jenis_ujian_id)
    if (tingkat) list = list.filter((s) => s.tingkat === tingkat)
    if (tanggal) list = list.filter((s) => s.tanggal === tanggal)
    if (search) {
      const q = String(search).toLowerCase()
      list = list.filter(
        (s) =>
          (s.subject_nama || '').toLowerCase().includes(q) ||
          (s.subject_kode || '').toLowerCase().includes(q),
      )
    }
    list.sort((a, b) => {
      if (a.tanggal !== b.tanggal) return (a.tanggal || '').localeCompare(b.tanggal || '')
      return (a.jam_mulai || '').localeCompare(b.jam_mulai || '')
    })
    return [200, { status: 'ok', data: list, count: list.length }, { delay: DELAY }]
  })

  // ── CREATE BATCH
  mock.onPost('/admin/exam-schedules/batch').reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const body = JSON.parse(config.data || '{}')
    const rows = Array.isArray(body.rows) ? body.rows : []
    if (rows.length === 0) {
      return [400, { error: 'empty', message: 'Tidak ada baris untuk disimpan' }, { delay: DELAY }]
    }
    const created = []
    rows.forEach((r, idx) => {
      const newEntry = {
        id: `esched-${tenant}-${Date.now()}-${idx}`,
        jenis_ujian_id: r.jenis_ujian_id,
        jenis_ujian_kode: r.jenis_ujian_kode,
        academic_year: r.academic_year,
        semester: r.semester,
        tingkat: r.tingkat,
        tanggal: r.tanggal,
        jam_mulai: r.jam_mulai,
        durasi_menit: Number(r.durasi_menit) || 90,
        subject_id: r.subject_id,
        subject_kode: r.subject_kode,
        subject_nama: r.subject_nama,
        kelompok: r.kelompok,
        jurusan_id: r.jurusan_id || null,
        details: Array.isArray(r.details) ? r.details : [],
        status: 'DRAFT',
        created_at: new Date().toISOString(),
        tenant_slug: tenant,
      }
      store.push(newEntry)
      created.push(newEntry)
    })
    return [201, { status: 'ok', created: created.length, data: created }, { delay: DELAY }]
  })

  // ── UPDATE
  mock.onPut(/\/admin\/exam-schedules\/([^/]+)/).reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const id = config.url.match(/\/admin\/exam-schedules\/([^/]+)/)[1]
    const body = JSON.parse(config.data || '{}')
    const idx = store.findIndex((s) => s.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]
    store[idx] = { ...store[idx], ...body, id }
    return [200, { status: 'ok', data: store[idx] }, { delay: DELAY }]
  })

  // ── DELETE
  mock.onDelete(/\/admin\/exam-schedules\/([^/]+)/).reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const id = config.url.match(/\/admin\/exam-schedules\/([^/]+)/)[1]
    const idx = store.findIndex((s) => s.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]
    store.splice(idx, 1)
    return [200, { status: 'ok' }, { delay: DELAY }]
  })
}
