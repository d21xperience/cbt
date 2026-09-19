// src/utils/tenant.js
//
// VER-001 CONTRACT (AI#1, 2026-09-19):
//   - Inject X-Tenant-Slug HANYA kalau ada nilai valid
//   - Jangan inject 'default' di root domain
//   - Jangan inject untuk IP address
//   - Jangan pakai multi-level subdomain
//
// VER-002 CONTRACT (AI#1, 2026-09-19):
//   - Source of truth routing = Host header / X-Tenant-Slug
//   - Frontend WAJIB persist tenant di dev (LocalStorage fallback)

import { LocalStorage } from 'quasar'

const STORAGE_KEY = 'cbt_tenant_slug'

export const getTenantSlug = () => {
  const hostname = window.location.hostname

  // ── Dev: localhost / 127.0.0.1 → query param + LocalStorage fallback
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const fromSearch = new URLSearchParams(window.location.search).get('tenant')
    if (fromSearch) return fromSearch

    if (window.location.hash) {
      const hashQuery = window.location.hash.split('?')[1]
      if (hashQuery) {
        const fromHash = new URLSearchParams(hashQuery).get('tenant')
        if (fromHash) return fromHash
      }
    }

    // BARU (VER-002): LocalStorage fallback untuk persist antar navigasi
    const fromStorage = LocalStorage.getItem(STORAGE_KEY)
    if (fromStorage && fromStorage !== 'null' && fromStorage !== 'undefined') {
      return fromStorage
    }

    return null
  }

  // ── IPv4 address → skip
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return null
  }

  // ── Production subdomain (single-level: {tenant}.ujian.pw)
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    return parts[0]
  }

  // ── Root domain → null
  return null
}

// Helper: simpan slug ke LocalStorage (dipanggil dari interceptor)
export const persistTenantSlug = (slug) => {
  if (!slug || slug === 'null' || slug === 'undefined') return
  if (import.meta.env.DEV) {
    LocalStorage.set(STORAGE_KEY, slug)
  }
}

// Helper: hapus slug (logout / mismatch)
export const clearTenantSlug = () => {
  LocalStorage.remove(STORAGE_KEY)
}
