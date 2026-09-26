// src/mocks/handlers/schoolProfileHandlers.js
import { mockSchoolProfiles } from '../data/schoolProfileData'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

// In-memory state per tenant slug
let profilesState = JSON.parse(JSON.stringify(mockSchoolProfiles))

export const resetSchoolProfileMockData = () => {
  profilesState = JSON.parse(JSON.stringify(mockSchoolProfiles))
}

const DEFAULT_SLUG = 'smkpasja'

const resolveProfile = (tenantSlug) => {
  const slug = String(tenantSlug || DEFAULT_SLUG).toLowerCase()
  return profilesState[slug] || profilesState[DEFAULT_SLUG]
}

export const schoolProfileHandlers = (mock) => {
  // GET /admin/school-profile — return based on X-Tenant-Slug
  mock.onGet('/admin/school-profile').reply((config) => {
    const tenantSlug = config.headers['X-Tenant-Slug'] || DEFAULT_SLUG
    const profile = resolveProfile(tenantSlug)
    console.info('[MOCK] GET /admin/school-profile →', tenantSlug, profile.jenjang)
    return [200, { status: 'ok', data: cloneMock(profile) }, { delay: DELAY }]
  })

  // PUT /admin/school-profile
  mock.onPut('/admin/school-profile').reply((config) => {
    const tenantSlug = config.headers['X-Tenant-Slug'] || DEFAULT_SLUG
    const slug = String(tenantSlug).toLowerCase()

    let body = {}
    try {
      body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {}
    } catch {
      return [400, { error: 'invalid_json' }, { delay: DELAY }]
    }

    console.info('[MOCK] PUT /admin/school-profile →', slug)

    if (!body.nama || !body.jenjang) {
      return [
        400,
        { error: 'validation_failed', message: 'Nama dan jenjang wajib.' },
        { delay: DELAY },
      ]
    }

    const current = profilesState[slug] || profilesState[DEFAULT_SLUG]
    profilesState[slug] = { ...current, ...body }

    return [
      200,
      {
        status: 'ok',
        message: 'Profil sekolah berhasil disimpan.',
        data: cloneMock(profilesState[slug]),
      },
      { delay: DELAY },
    ]
  })
}
