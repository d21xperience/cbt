// src/mocks/handlers/roomsHandlers.js
// Handler CRUD ruang ujian — tenant-aware.
import { getRoomsByTenant } from '../data/roomsData'
import { resolveTenant } from '../data/tenantHelpers'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

const roomsStore = {}

const ensureStore = (tenant) => {
  if (!roomsStore[tenant]) {
    roomsStore[tenant] = cloneMock(getRoomsByTenant(tenant))
  }
  return roomsStore[tenant]
}

export const resetRoomsMockData = () => {
  Object.keys(roomsStore).forEach((k) => delete roomsStore[k])
}

export const roomsHandlers = (mock) => {
  // LIST
  mock.onGet('/admin/rooms').reply((config) => {
    const tenant = resolveTenant(config)
    const { search, gedung } = config.params || {}
    let list = cloneMock(ensureStore(tenant))
    if (search) {
      const q = String(search).toLowerCase()
      list = list.filter(
        (r) => r.nama.toLowerCase().includes(q) || (r.keterangan || '').toLowerCase().includes(q),
      )
    }
    if (gedung) list = list.filter((r) => r.gedung === gedung)
    return [200, { status: 'ok', data: list, count: list.length }, { delay: DELAY }]
  })

  // CREATE
  mock.onPost('/admin/rooms').reply((config) => {
    const tenant = resolveTenant(config)
    const body = JSON.parse(config.data || '{}')
    const store = ensureStore(tenant)

    if (!body.nama) {
      return [400, { error: 'validation_failed', message: 'nama wajib' }, { delay: DELAY }]
    }
    if (store.find((r) => r.nama.toLowerCase() === body.nama.toLowerCase())) {
      return [
        409,
        { error: 'nama_taken', message: `Ruang '${body.nama}' sudah ada` },
        { delay: DELAY },
      ]
    }
    const newRoom = {
      id: `room-${Date.now()}`,
      nama: body.nama,
      gedung: body.gedung || '',
      lantai: body.lantai || 1,
      kapasitas: body.kapasitas || 0,
      keterangan: body.keterangan || '',
      aktif: body.aktif !== false,
      tenant_slug: tenant,
    }
    store.unshift(newRoom)
    return [201, { status: 'ok', data: newRoom }, { delay: DELAY }]
  })

  // UPDATE
  mock.onPut(/\/admin\/rooms\/([^/]+)/).reply((config) => {
    const tenant = resolveTenant(config)
    const id = config.url.match(/\/admin\/rooms\/([^/]+)/)[1]
    const body = JSON.parse(config.data || '{}')
    const store = ensureStore(tenant)
    const idx = store.findIndex((r) => r.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    if (body.nama) {
      const dup = store.find((r) => r.id !== id && r.nama.toLowerCase() === body.nama.toLowerCase())
      if (dup) return [409, { error: 'nama_taken' }, { delay: DELAY }]
    }
    store[idx] = { ...store[idx], ...body, id }
    return [200, { status: 'ok', data: store[idx] }, { delay: DELAY }]
  })

  // DELETE
  mock.onDelete(/\/admin\/rooms\/([^/]+)/).reply((config) => {
    const tenant = resolveTenant(config)
    const id = config.url.match(/\/admin\/rooms\/([^/]+)/)[1]
    const store = ensureStore(tenant)
    const idx = store.findIndex((r) => r.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]
    store.splice(idx, 1)
    return [200, { status: 'ok' }, { delay: DELAY }]
  })
}
