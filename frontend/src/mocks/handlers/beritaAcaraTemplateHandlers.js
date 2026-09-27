// src/mocks/handlers/beritaAcaraTemplateHandlers.js
import { mockBeritaAcaraTemplates } from '../data/beritaAcaraTemplateData'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300
const DEFAULT_SLUG = 'smkpasja'

let store = cloneMock(mockBeritaAcaraTemplates)

export const resetBeritaAcaraTemplateMockData = () => {
  store = cloneMock(mockBeritaAcaraTemplates)
}

export const beritaAcaraTemplateHandlers = (mock) => {
  // GET /admin/berita-acara-template — berdasarkan X-Tenant-Slug
  mock.onGet('/admin/berita-acara-template').reply((config) => {
    const slug = String(config.headers['X-Tenant-Slug'] || DEFAULT_SLUG).toLowerCase()
    const tpl = store[slug] || store[DEFAULT_SLUG]
    return [200, { status: 'ok', data: cloneMock(tpl) }, { delay: DELAY }]
  })

  // PUT /admin/berita-acara-template
  mock.onPut('/admin/berita-acara-template').reply((config) => {
    const slug = String(config.headers['X-Tenant-Slug'] || DEFAULT_SLUG).toLowerCase()
    let body = {}
    try {
      body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {}
    } catch {
      return [400, { error: 'invalid_json' }, { delay: DELAY }]
    }
    if (!body.header?.judul) {
      return [400, { error: 'validation_failed', message: 'Judul wajib diisi' }, { delay: DELAY }]
    }
    const current = store[slug] || store[DEFAULT_SLUG]
    store[slug] = {
      ...current,
      ...body,
      id: current.id,
      updated_at: new Date().toISOString(),
    }
    return [
      200,
      { status: 'ok', message: 'Template tersimpan', data: cloneMock(store[slug]) },
      { delay: DELAY },
    ]
  })
}
