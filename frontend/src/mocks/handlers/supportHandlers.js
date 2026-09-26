// src/mocks/handlers/supportHandlers.js
// Mock untuk Service After-Sales — VER-012 pending.

import { mockSupportLogs } from '../data/supportData'
import { cloneMock } from '../data/keahlianData'

const DELAY = 200

let logs = cloneMock(mockSupportLogs)

export const resetSupportMockData = () => {
  logs = cloneMock(mockSupportLogs)
}

export const supportHandlers = (mock) => {
  // GET /super/support/logs
  mock.onGet('/super/support/logs').reply(() => {
    return [200, cloneMock(logs), { delay: DELAY }]
  })

  // POST /super/support/logs
  mock.onPost('/super/support/logs').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] POST /super/support/logs →', body) // ← BARU
    if (!body.school_name || !body.message) {
      return [
        400,
        { error: 'validation_failed', message: 'school_name & message wajib' },
        { delay: DELAY },
      ]
    }

    const newLog = {
      id: `log-${Date.now()}`,
      school_name: body.school_name,
      contact_phone: body.contact_phone || '',
      direction: body.direction || 'INBOUND',
      message: body.message,
      status: body.status || 'PENDING',
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      admin_notes: body.admin_notes || '',
    }
    logs.unshift(newLog)
    return [201, { status: 'ok', data: newLog }, { delay: DELAY }]
  })

  // PUT /super/support/logs/:id
  mock.onPut(/\/super\/support\/logs\/([^/]+)/).reply((config) => {
    const match = config.url.match(/\/super\/support\/logs\/([^/]+)/)
    const id = match ? match[1] : null
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] PUT /super/support/logs/:id →', id, body) // ← BARU

    const idx = logs.findIndex((l) => l.id === id)
    if (idx === -1) {
      return [404, { error: 'log_not_found' }, { delay: DELAY }]
    }

    logs[idx] = { ...logs[idx], ...body, id: logs[idx].id }
    return [200, { status: 'ok', data: logs[idx] }, { delay: DELAY }]
  })

  // DELETE /super/support/logs/:id
  mock.onDelete(/\/super\/support\/logs\/([^/]+)/).reply((config) => {
    const match = config.url.match(/\/super\/support\/logs\/([^/]+)/)
    const id = match ? match[1] : null
    console.info('[MOCK] DELETE /super/support/logs/:id →', id) // ← BARU
    const idx = logs.findIndex((l) => l.id === id)
    if (idx === -1) {
      return [404, { error: 'log_not_found' }, { delay: DELAY }]
    }

    logs.splice(idx, 1)
    return [200, { status: 'ok', message: 'Log dihapus' }, { delay: DELAY }]
  })
}
