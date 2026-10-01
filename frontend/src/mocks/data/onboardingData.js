// src/mocks/data/onboardingData.js
// Data dummy untuk fitur School Onboarding & Public Directory.
// Kontrak mengikuti BACKEND_CONTRACT.md — JANGAN ubah field name tanpa update backend.

export const mockPublicSchools = [
  {
    subdomain: 'smkpasja',
    school_name: 'SMKS Pasundan Jatinangor',
    npsn: '20254180',
    logo_url:
      'https://secure.gravatar.com/blavatar/c496a1bffad53498d1a9e87762da85b750b0b4352be5f869e4f916a9edd70612?s=200&ts=1787824046',
  },
  {
    subdomain: 'smknkawali',
    school_name: 'SMKN Kawali',
    npsn: '20254181',
    logo_url:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTUcXma1kS1scjvVZ5HWKHmjEZm0BHJWCe890-d77jbsw&s=10',
  },
  {
    subdomain: 'sman1cirebon',
    school_name: 'SMA Negeri 1 Cirebon',
    npsn: '20254182',
    logo_url:
      'https://upload.wikimedia.org/wikipedia/commons/4/4c/SMANSA_PS.png?utm_source=id.wikipedia.org&utm_campaign=index&utm_content=original',
  },
  {
    subdomain: 'mtsmaarifjtr',
    school_name: 'MTs. Maarif Cikeruh',
    npsn: '20278969',
    logo_url: 'https://www.mtssdlingo.sch.id/style/img/logo_wa.png',
  },
  {
    subdomain: 'smpn1jtr',
    school_name: 'SMP NEGERI 1 JATINANGOR ',
    npsn: '20208435',
    logo_url:
      'https://yt3.googleusercontent.com/shtalb7Vsdvv9mzC3iaXzcGaN2MKwk4IkJ63zQWpZF9VW0-5ujoDDME46TZapUFpm6e3ueEL2g=s900-c-k-c0x00ffffff-no-rj',
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
