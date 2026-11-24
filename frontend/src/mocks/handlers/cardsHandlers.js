// src/mocks/handlers/cardsHandlers.js
// Handler Kartu Ujian — 2b-3a — tenant-aware

import { getCardsByTenant, makeCardNumber, makeQrToken, makePin } from '../data/cardsData'
import { resolveTenant } from '../data/tenantHelpers'
import { cloneMock } from '../data/keahlianData'

const cardsStore = {} // { tenant: [...] }

const ensureStore = (tenant) => {
  if (!cardsStore[tenant]) {
    cardsStore[tenant] = cloneMock(getCardsByTenant(tenant))
  }
  return cardsStore[tenant]
}

export const resetCardsMockData = () => {
  Object.keys(cardsStore).forEach((k) => delete cardsStore[k])
}

export const cardsHandlers = (mock) => {
  // ── LIST
  mock.onGet('/admin/cards').reply((config) => {
    const tenant = resolveTenant(config)
    const { search, card_type, status } = config.params || {}
    let rows = [...ensureStore(tenant)]

    if (search) {
      const q = String(search).toLowerCase()
      rows = rows.filter(
        (c) =>
          c.student_name.toLowerCase().includes(q) ||
          c.card_number.toLowerCase().includes(q) ||
          c.student_nis?.toLowerCase().includes(q),
      )
    }
    if (card_type && card_type !== 'SEMUA') rows = rows.filter((c) => c.card_type === card_type)
    if (status && status !== 'SEMUA') rows = rows.filter((c) => c.status === status)

    return [200, { success: true, data: rows, total: rows.length }]
  })

  // ── CREATE
  mock.onPost('/admin/cards').reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const body = JSON.parse(config.data || '{}')
    const student = body.student || {}
    const cardType = body.card_type || 'PERMANENT'
    const seq = store.length + 1

    const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
    let pwd = ''
    for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)]

    const newCard = {
      id: `card-${tenant}-${Date.now()}`,
      card_number: makeCardNumber(seq),
      student_id: student.id,
      student_name: student.nama,
      student_nis: student.nis,
      student_nisn: student.nisn,
      student_photo_url: student.photo_url || null,
      class_id: student.kelas_id,
      class_nama: student.kelas_nama,
      card_type: cardType,
      status: 'ACTIVE',
      qr_token: makeQrToken(),
      signature_qr_token: makeQrToken(),
      pin: cardType === 'TEMPORARY' ? makePin() : null,
      username: (student.nama || '').toLowerCase().replace(/\s+/g, '.') + seq,
      password: pwd,
      device_fingerprint: null,
      device_bound_at: null,
      expiry_date: cardType === 'TEMPORARY' ? body.expiry_date : null,
      reason: cardType === 'TEMPORARY' ? body.reason : null,
      printed_at: null,
      printed_by: null,
      created_at: new Date().toISOString(),
      tenant_slug: tenant,
    }
    store.unshift(newCard)
    return [201, { success: true, data: newCard }]
  })

  // ── REVOKE
  mock.onPost(/\/admin\/cards\/[^/]+\/revoke$/).reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const id = config.url.split('/')[3]
    const card = store.find((c) => c.id === id)
    if (!card) return [404, { success: false, message: 'Kartu tidak ditemukan' }]
    card.status = 'REVOKED'
    return [200, { success: true, data: card }]
  })

  // ── RESET DEVICE BINDING (Q-E)
  mock.onPost(/\/admin\/cards\/[^/]+\/reset-device$/).reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const id = config.url.split('/')[3]
    const card = store.find((c) => c.id === id)
    if (!card) return [404, { success: false, message: 'Kartu tidak ditemukan' }]
    card.device_fingerprint = null
    card.device_bound_at = null
    return [200, { success: true, data: card }]
  })

  // ── MARK PRINTED
  mock.onPost(/\/admin\/cards\/[^/]+\/mark-printed$/).reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const id = config.url.split('/')[3]
    const card = store.find((c) => c.id === id)
    if (!card) return [404, { success: false, message: 'Kartu tidak ditemukan' }]
    card.printed_at = new Date().toISOString()
    card.printed_by = 'Admin'
    return [200, { success: true, data: card }]
  })
}
