// src/mocks/data/onboardingData.js
// Data dummy untuk fitur School Onboarding & Public Directory.
// Kontrak mengikuti BACKEND_CONTRACT.md — JANGAN ubah field name tanpa update backend.

export const mockPublicSchools = [
  {
    subdomain: 'smkpasja',
    school_name: 'SMKS Pasundan Jatinangor',
    npsn: '20254180',
    logo_url: 'https://cdn.quasar.dev/logo/svg/quasar-logo.svg',
  },
  {
    subdomain: 'smknkawali',
    school_name: 'SMKN Kawali',
    npsn: '20254181',
    logo_url: 'https://cdn.quasar.dev/logo/svg/quasar-logo.svg',
  },
  {
    subdomain: 'sman1cirebon',
    school_name: 'SMA Negeri 1 Cirebon',
    npsn: '20254182',
    logo_url: 'https://cdn.quasar.dev/logo/svg/quasar-logo.svg',
  },
]

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

// Deep copy helper — hindari mutasi data statis antar-test
export const cloneMock = (v) => JSON.parse(JSON.stringify(v))
