// src/mocks/data/onboardingData.js
// Data untuk fitur School Onboarding.
//
// - getPublicSchools(): DERIVED dari mockSchoolTenant (identity) + mockSchoolProfiles (logo)
//   Tidak ada duplikasi — single source per field.
// - mockPendingSchools: data pending onboarding (khusus superadmin), tetap standalone.

import { mockSchoolTenant } from './superadminData'
import { mockSchoolProfiles } from './schoolProfileData'

// Helper deep copy (dipakai juga oleh superAdminHandlers)
export const cloneMock = (v) => JSON.parse(JSON.stringify(v))

/**
 * Public directory untuk landing page.
 * Return list sekolah aktif (is_active = true) dengan minimal fields:
 *   subdomain, school_name, npsn, logo_url
 */
export const getPublicSchools = () => {
  return mockSchoolTenant
    .filter((t) => t.is_active !== false)
    .map((t) => {
      const profile = mockSchoolProfiles[t.slug] || {}
      return {
        subdomain: t.slug,
        school_name: t.school_name,
        npsn: t.npsn,
        logo_url: profile.logo_url || '',
      }
    })
}

// ═══════════════════════════════════════════════════════
// Pending schools — tetap standalone (data pre-onboarding)
// ═══════════════════════════════════════════════════════
export const mockPendingSchools = [
  {
    tenant_id: 'tenant-uuid-001',
    npsn: '20259901',
    school_name: 'SMA Harapan Bangsa',
    subdomain: 'smaharapanbangsa',
    contact_email: 'admin@smaharapanbangsa.sch.id',
    created_at: '2026-09-18T10:30:00Z',
  },
  {
    tenant_id: 'tenant-uuid-002',
    npsn: '20259902',
    school_name: 'MTs Al-Ikhlas',
    subdomain: 'mtsalikhlas',
    contact_email: 'admin@mtsalikhlas.sch.id',
    created_at: '2026-09-19T08:15:00Z',
  },
]
