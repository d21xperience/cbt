// src/mocks/data/schoolIdentityHelper.js
// Helper merge: identity (superadmin) + extension (admin sekolah).
//
// ATURAN FIELD OWNERSHIP:
//   Superadmin (mockSchoolTenant)   → nama, jenjang, npsn, program_duration_years
//   Admin (mockSchoolProfiles)      → logo_url, nss, kode_sekolah, alamat_*,
//                                     telp, email, website, kepala_sekolah_*
//
// Kolom identitas di superadmin jadi source of truth — kalau admin sekolah
// coba update, PUT handler akan mengabaikannya (whitelist extension only).

import { mockSchoolTenant } from './superadminData'
import { mockSchoolProfiles } from './schoolProfileData'

const DEFAULT_SLUG = 'smkpasja'

// Kolom yang hanya boleh diubah admin sekolah (extension)
export const EXTENSION_FIELDS = [
  'logo_url',
  'nss',
  'kode_sekolah',
  'alamat_jalan',
  'alamat_desa',
  'alamat_kecamatan',
  'alamat_kabupaten',
  'alamat_provinsi',
  'alamat_kode_pos',
  'telp',
  'email',
  'website',
  'kepala_sekolah_nama',
  'kepala_sekolah_nip',
]

// Kolom identity (read-only dari sisi admin)
export const IDENTITY_FIELDS = ['nama', 'jenjang', 'npsn', 'program_duration_years']

/**
 * Merge identity dari tenant + extension dari profile.
 * Return single object siap pakai di UI.
 */
export const getMergedSchoolProfile = (tenant) => {
  const slug = String(tenant || DEFAULT_SLUG).toLowerCase()
  const tenantData = mockSchoolTenant.find((t) => t.slug === slug) || {}
  const profileData = mockSchoolProfiles[slug] || mockSchoolProfiles[DEFAULT_SLUG] || {}

  return {
    // Identity dari superadmin
    nama: tenantData.school_name || '',
    jenjang: tenantData.jenjang || '',
    npsn: tenantData.npsn || '',
    program_duration_years: tenantData.program_duration_years || 3,
    // Extension dari admin
    ...profileData,
  }
}

/**
 * Whitelist: ambil hanya extension fields dari payload admin.
 * Identity fields akan dibuang (dikelola superadmin).
 */
export const pickExtensionFields = (payload) => {
  if (!payload || typeof payload !== 'object') return {}
  const out = {}
  EXTENSION_FIELDS.forEach((f) => {
    if (Object.prototype.hasOwnProperty.call(payload, f)) {
      out[f] = payload[f]
    }
  })
  return out
}
