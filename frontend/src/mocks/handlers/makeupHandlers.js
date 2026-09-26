// src/mocks/handlers/makeupHandlers.js
import { mockMakeupItems } from '../data/makeupData'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

let items = cloneMock(mockMakeupItems)

export const resetMakeupMockData = () => {
  items = cloneMock(mockMakeupItems)
}

export const makeupHandlers = (mock) => {
  // GET /admin/makeup — list
  mock.onGet('/admin/makeup').reply((config) => {
    const params = config.params || {}
    let list = cloneMock(items)

    if (params.status) list = list.filter((i) => i.status === params.status)
    if (params.class_id) list = list.filter((i) => i.class_id === params.class_id)
    if (params.subject_id) list = list.filter((i) => i.subject_id === params.subject_id)

    return [200, { status: 'ok', data: list, count: list.length }, { delay: DELAY }]
  })

  // POST /admin/makeup/:student_id/start
  mock.onPost(/\/admin\/makeup\/([^/]+)\/start/).reply((config) => {
    const studentId = config.url.match(/\/admin\/makeup\/([^/]+)\/start/)[1]
    console.info('[MOCK] POST /admin/makeup/:student_id/start →', studentId)

    const idx = items.findIndex((i) => i.student_id === studentId)
    if (idx === -1) return [404, { error: 'student_not_found' }, { delay: DELAY }]

    items[idx].status = 'IN_PROGRESS'
    items[idx].started_at = new Date().toISOString()

    return [200, { status: 'ok', data: cloneMock(items[idx]) }, { delay: DELAY }]
  })
}
