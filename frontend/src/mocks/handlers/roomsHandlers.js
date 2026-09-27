// src/mocks/handlers/roomsHandlers.js
import { mockRooms } from '../data/roomsData'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

let rooms = cloneMock(mockRooms)

export const resetRoomsMockData = () => {
  rooms = cloneMock(mockRooms)
}

export const roomsHandlers = (mock) => {
  // ── LIST
  mock.onGet('/admin/rooms').reply((config) => {
    const { search, gedung } = config.params || {}
    let list = cloneMock(rooms)
    if (search) {
      const q = String(search).toLowerCase()
      list = list.filter(
        (r) => r.nama.toLowerCase().includes(q) || (r.keterangan || '').toLowerCase().includes(q),
      )
    }
    if (gedung) list = list.filter((r) => r.gedung === gedung)
    return [200, { status: 'ok', data: list, count: list.length }, { delay: DELAY }]
  })

  // ── CREATE
  mock.onPost('/admin/rooms').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    if (!body.nama) {
      return [400, { error: 'validation_failed', message: 'nama wajib' }, { delay: DELAY }]
    }
    if (rooms.find((r) => r.nama.toLowerCase() === body.nama.toLowerCase())) {
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
    }
    rooms.unshift(newRoom)
    return [201, { status: 'ok', data: newRoom }, { delay: DELAY }]
  })

  // ── UPDATE
  mock.onPut(/\/admin\/rooms\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/admin\/rooms\/([^/]+)/)[1]
    const body = JSON.parse(config.data || '{}')
    const idx = rooms.findIndex((r) => r.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]

    if (body.nama) {
      const dup = rooms.find((r) => r.id !== id && r.nama.toLowerCase() === body.nama.toLowerCase())
      if (dup) return [409, { error: 'nama_taken' }, { delay: DELAY }]
    }
    rooms[idx] = { ...rooms[idx], ...body, id }
    return [200, { status: 'ok', data: rooms[idx] }, { delay: DELAY }]
  })

  // ── DELETE
  mock.onDelete(/\/admin\/rooms\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/admin\/rooms\/([^/]+)/)[1]
    const idx = rooms.findIndex((r) => r.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]
    rooms.splice(idx, 1)
    return [200, { status: 'ok' }, { delay: DELAY }]
  })
}
