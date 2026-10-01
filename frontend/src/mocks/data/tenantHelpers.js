// src/mocks/data/tenantHelpers.js
// Helper untuk multi-tenant data access (mocks layer).
// Konsisten dengan pattern di examHandlers/sessionsHandlers.

export const TENANT_SLUGS = [
  'smkpasja',
  'smknkawali',
  'mtsmaarifjtr',
  'smpn1jatinangor',
  'sman1cirebon',
]

export const DEFAULT_TENANT = 'smknkawali'

/**
 * Resolve tenant slug dari axios config (header X-Tenant-Slug atau query ?tenant=).
 * Fallback ke default kalau tidak ada.
 */
export const resolveTenant = (config, fallback = DEFAULT_TENANT) => {
  if (config) {
    const h = config.headers?.['X-Tenant-Slug'] || config.headers?.['x-tenant-slug']
    if (h) return String(h).trim()
    if (config.params?.tenant) return String(config.params.tenant).trim()
  }
  return fallback
}

/**
 * Filter flat list berdasarkan tenant_slug.
 */
export const filterByTenant = (list, tenant) =>
  (Array.isArray(list) ? list : []).filter((item) => item?.tenant_slug === tenant)

/**
 * Group flat list by tenant_slug → { tenantA: [...], tenantB: [...] }
 */
export const groupByTenant = (flatList) => {
  const out = {}
  ;(Array.isArray(flatList) ? flatList : []).forEach((item) => {
    const t = item?.tenant_slug
    if (!t) return
    if (!out[t]) out[t] = []
    out[t].push(item)
  })
  return out
}

/**
 * Flatten grouped → flat array.
 */
export const flattenTenants = (grouped) => Object.values(grouped || {}).flat()
