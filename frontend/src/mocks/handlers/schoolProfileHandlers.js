// src/mocks/handlers/schoolProfileHandlers.js
// Handler Profil Sekolah — extension only (identity dari superadmin).

import { mockSchoolProfiles } from '../data/schoolProfileData'
import { getMergedSchoolProfile, pickExtensionFields } from '../data/schoolIdentityHelper'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

// In-memory extension state per tenant (identity tidak disimpan di sini)
let profilesState = JSON.parse(JSON.stringify(mockSchoolProfiles))

export const resetSchoolProfileMockData = () => {
  profilesState = JSON.parse(JSON.stringify(mockSchoolProfiles))
}

const DEFAULT_SLUG = 'smkpasja'

const resolveSlug = (tenantSlug) => String(tenantSlug || DEFAULT_SLUG).toLowerCase()

// Merge: identity dari helper + extension dari profilesState (in-memory)
const resolveMergedProfile = (slug) => {
  const merged = getMergedSchoolProfile(slug)
  const extensionState = profilesState[slug] || profilesState[DEFAULT_SLUG] || {}
  return { ...merged, ...extensionState }
}

export const schoolProfileHandlers = (mock) => {
  // GET /admin/school-profile — return MERGED (identity + extension)
  mock.onGet('/admin/school-profile').reply((config) => {
    const slug = resolveSlug(config.headers['X-Tenant-Slug'])
    const merged = resolveMergedProfile(slug)
    console.info('[MOCK] GET /admin/school-profile →', slug, merged.jenjang)
    return [200, { status: 'ok', data: cloneMock(merged) }, { delay: DELAY }]
  })

  // PUT /admin/school-profile — WHITELIST extension fields only
  mock.onPut('/admin/school-profile').reply((config) => {
    const slug = resolveSlug(config.headers['X-Tenant-Slug'])

    let body = {}
    try {
      body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {}
    } catch {
      return [400, { error: 'invalid_json' }, { delay: DELAY }]
    }

    console.info('[MOCK] PUT /admin/school-profile →', slug)

    // Validasi minimal — hanya cek field extension (identity tidak boleh kosong)
    // Validasi nama/jenjang dihapus karena bukan wewenang admin

    // Ambil hanya extension fields (buang identity kalau ada)
    // Ambil hanya extension fields (buang identity kalau ada)
    const extensionPatch = pickExtensionFields(body)

    // ── Validasi logo (F0.6c-1)
    const LOGO_MAX_LENGTH = 2 * 1024 * 1024 // base64 1MB → ~1.37MB text, kasih buffer
    if (Object.prototype.hasOwnProperty.call(extensionPatch, 'logo_url')) {
      const logo = String(extensionPatch.logo_url || '')
      if (logo && !logo.startsWith('data:image/')) {
        return [
          400,
          { error: 'invalid_logo', message: 'Logo harus berupa data URL (base64).' },
          { delay: DELAY },
        ]
      }
      if (logo.length > LOGO_MAX_LENGTH) {
        return [
          400,
          { error: 'logo_too_large', message: 'Ukuran logo terlalu besar (max 1 MB).' },
          { delay: DELAY },
        ]
      }
    }
    const current = profilesState[slug] || profilesState[DEFAULT_SLUG] || {}
    profilesState[slug] = { ...current, ...extensionPatch }

    // Return MERGED (identity tetap dari tenant)
    const merged = resolveMergedProfile(slug)

    return [
      200,
      {
        status: 'ok',
        message: 'Profil sekolah berhasil disimpan.',
        data: cloneMock(merged),
      },
      { delay: DELAY },
    ]
  })
}
