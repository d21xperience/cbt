// src/mocks/handlers/infrastructureHandlers.js
import { mockVps, mockDomains, mockTlsCerts } from '../data/infrastructureData'
import { cloneMock } from '../data/keahlianData'

const DELAY = 200

// In-memory state
let vpsList = cloneMock(mockVps)
let domainsList = cloneMock(mockDomains)
let tlsList = cloneMock(mockTlsCerts)

export const resetInfrastructureMockData = () => {
  vpsList = cloneMock(mockVps)
  domainsList = cloneMock(mockDomains)
  tlsList = cloneMock(mockTlsCerts)
}

// const getList = (resource) => {
//   if (resource === 'vps') return vpsList
//   if (resource === 'domains') return domainsList
//   if (resource === 'tls') return tlsList
//   return null
// }

const genId = (resource) => `${resource}-${Date.now()}`

export const infrastructureHandlers = (mock) => {
  // ══════════════════════════════════════════════════════
  // VPS
  // ══════════════════════════════════════════════════════
  mock.onGet('/super/infra/vps').reply(() => {
    return [200, cloneMock(vpsList), { delay: DELAY }]
  })

  mock.onPost('/super/infra/vps').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] POST /super/infra/vps →', body)
    if (!body.vendor || !body.package || !body.tanggal_expiry) {
      return [400, { error: 'validation_failed' }, { delay: DELAY }]
    }
    const newItem = { ...body, id: genId('vps') }
    vpsList.unshift(newItem)
    return [201, { status: 'ok', data: newItem }, { delay: DELAY }]
  })

  mock.onPut(/\/super\/infra\/vps\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/super\/infra\/vps\/([^/]+)/)[1]
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] PUT /super/infra/vps/:id →', id)
    const idx = vpsList.findIndex((v) => v.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]
    vpsList[idx] = { ...vpsList[idx], ...body, id }
    return [200, { status: 'ok', data: vpsList[idx] }, { delay: DELAY }]
  })

  mock.onDelete(/\/super\/infra\/vps\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/super\/infra\/vps\/([^/]+)/)[1]
    console.info('[MOCK] DELETE /super/infra/vps/:id →', id)
    const idx = vpsList.findIndex((v) => v.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]
    vpsList.splice(idx, 1)
    return [200, { status: 'ok' }, { delay: DELAY }]
  })

  // ══════════════════════════════════════════════════════
  // DOMAINS
  // ══════════════════════════════════════════════════════
  mock.onGet('/super/infra/domains').reply(() => {
    return [200, cloneMock(domainsList), { delay: DELAY }]
  })

  mock.onPost('/super/infra/domains').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] POST /super/infra/domains →', body)
    if (!body.domain || !body.registrar || !body.tanggal_expiry) {
      return [400, { error: 'validation_failed' }, { delay: DELAY }]
    }
    const newItem = { ...body, id: genId('dom') }
    domainsList.unshift(newItem)
    return [201, { status: 'ok', data: newItem }, { delay: DELAY }]
  })

  mock.onPut(/\/super\/infra\/domains\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/super\/infra\/domains\/([^/]+)/)[1]
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] PUT /super/infra/domains/:id →', id)
    const idx = domainsList.findIndex((d) => d.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]
    domainsList[idx] = { ...domainsList[idx], ...body, id }
    return [200, { status: 'ok', data: domainsList[idx] }, { delay: DELAY }]
  })

  mock.onDelete(/\/super\/infra\/domains\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/super\/infra\/domains\/([^/]+)/)[1]
    console.info('[MOCK] DELETE /super/infra/domains/:id →', id)
    const idx = domainsList.findIndex((d) => d.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]
    domainsList.splice(idx, 1)
    return [200, { status: 'ok' }, { delay: DELAY }]
  })

  // ══════════════════════════════════════════════════════
  // TLS
  // ══════════════════════════════════════════════════════
  mock.onGet('/super/infra/tls').reply(() => {
    return [200, cloneMock(tlsList), { delay: DELAY }]
  })

  mock.onPost('/super/infra/tls').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] POST /super/infra/tls →', body)
    if (!body.domain || !body.issuer || !body.tanggal_expiry) {
      return [400, { error: 'validation_failed' }, { delay: DELAY }]
    }
    const newItem = { ...body, id: genId('tls') }
    tlsList.unshift(newItem)
    return [201, { status: 'ok', data: newItem }, { delay: DELAY }]
  })

  mock.onPut(/\/super\/infra\/tls\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/super\/infra\/tls\/([^/]+)/)[1]
    const body = JSON.parse(config.data || '{}')
    console.info('[MOCK] PUT /super/infra/tls/:id →', id)
    const idx = tlsList.findIndex((t) => t.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]
    tlsList[idx] = { ...tlsList[idx], ...body, id }
    return [200, { status: 'ok', data: tlsList[idx] }, { delay: DELAY }]
  })

  mock.onDelete(/\/super\/infra\/tls\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/super\/infra\/tls\/([^/]+)/)[1]
    console.info('[MOCK] DELETE /super/infra/tls/:id →', id)
    const idx = tlsList.findIndex((t) => t.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]
    tlsList.splice(idx, 1)
    return [200, { status: 'ok' }, { delay: DELAY }]
  })
}
