// src/mocks/data/subjectsData.js
// Mock Master Mata Pelajaran — multi-tenant.
//
// Pattern: shared BASE (kurikulum nasional) + TENANT_EXTRAS (mapel lokal per tenant).
// Runtime: grouped per tenant, tapi code DRY.
//
// ATURAN (per Permendikdasmen 13/2025):
//   - Kelompok: WAJIB | PILIHAN | MULOK | KEJURUAN
//   - tingkat: 7/8/9 (SMP/MTs) atau 10/11/12/13 (SMA/MA/SMK/MAK)
//   - jurusan_id: hanya untuk kelompok KEJURUAN (SMK/MAK)

import { TENANT_SLUGS, DEFAULT_TENANT, flattenTenants } from './tenantHelpers'

// ── BASE: kurikulum nasional (dipakai semua tenant)
const BASE_SUBJECTS = [
  // WAJIB tingkat 10 (SMA/SMK)
  {
    id: 'sub-001',
    kode: 'PAIBP-10',
    nama: 'Pendidikan Agama Islam dan Budi Pekerti',
    nama_singkat: 'PAIBP',
    kelompok: 'WAJIB',
    tingkat: '10',
    jurusan_id: null,
  },
  {
    id: 'sub-002',
    kode: 'PPKN-10',
    nama: 'Pendidikan Pancasila dan Kewarganegaraan',
    nama_singkat: 'PPKn',
    kelompok: 'WAJIB',
    tingkat: '10',
    jurusan_id: null,
  },
  {
    id: 'sub-003',
    kode: 'BIN-10',
    nama: 'Bahasa Indonesia',
    nama_singkat: 'B.IND',
    kelompok: 'WAJIB',
    tingkat: '10',
    jurusan_id: null,
  },
  {
    id: 'sub-004',
    kode: 'MTK-10',
    nama: 'Matematika',
    nama_singkat: 'MTK',
    kelompok: 'WAJIB',
    tingkat: '10',
    jurusan_id: null,
  },
  {
    id: 'sub-005',
    kode: 'BING-10',
    nama: 'Bahasa Inggris',
    nama_singkat: 'B.ING',
    kelompok: 'WAJIB',
    tingkat: '10',
    jurusan_id: null,
  },

  // WAJIB tingkat 11
  {
    id: 'sub-006',
    kode: 'PAIBP-11',
    nama: 'Pendidikan Agama Islam dan Budi Pekerti',
    nama_singkat: 'PAIBP',
    kelompok: 'WAJIB',
    tingkat: '11',
    jurusan_id: null,
  },
  {
    id: 'sub-007',
    kode: 'PPKN-11',
    nama: 'Pendidikan Pancasila dan Kewarganegaraan',
    nama_singkat: 'PPKn',
    kelompok: 'WAJIB',
    tingkat: '11',
    jurusan_id: null,
  },
  {
    id: 'sub-008',
    kode: 'BIN-11',
    nama: 'Bahasa Indonesia',
    nama_singkat: 'B.IND',
    kelompok: 'WAJIB',
    tingkat: '11',
    jurusan_id: null,
  },
  {
    id: 'sub-009',
    kode: 'MTK-11',
    nama: 'Matematika',
    nama_singkat: 'MTK',
    kelompok: 'WAJIB',
    tingkat: '11',
    jurusan_id: null,
  },
  {
    id: 'sub-010',
    kode: 'BING-11',
    nama: 'Bahasa Inggris',
    nama_singkat: 'B.ING',
    kelompok: 'WAJIB',
    tingkat: '11',
    jurusan_id: null,
  },

  // WAJIB tingkat 12
  {
    id: 'sub-011',
    kode: 'BIN-12',
    nama: 'Bahasa Indonesia',
    nama_singkat: 'B.IND',
    kelompok: 'WAJIB',
    tingkat: '12',
    jurusan_id: null,
  },
  {
    id: 'sub-012',
    kode: 'MTK-12',
    nama: 'Matematika',
    nama_singkat: 'MTK',
    kelompok: 'WAJIB',
    tingkat: '12',
    jurusan_id: null,
  },

  // KEJURUAN (SMK/MAK) — per jurusan
  {
    id: 'sub-013',
    kode: 'DDK-TKJ-10',
    nama: 'Dasar-Dasar Keahlian TKJ',
    nama_singkat: 'DDK-TKJ',
    kelompok: 'KEJURUAN',
    tingkat: '10',
    jurusan_id: 'prog-tkj',
  },
  {
    id: 'sub-014',
    kode: 'KK-TKJ-11',
    nama: 'Konsentrasi Keahlian TKJ',
    nama_singkat: 'KK-TKJ',
    kelompok: 'KEJURUAN',
    tingkat: '11',
    jurusan_id: 'prog-tkj',
  },
  {
    id: 'sub-015',
    kode: 'DDK-RPL-10',
    nama: 'Dasar-Dasar Keahlian RPL',
    nama_singkat: 'DDK-RPL',
    kelompok: 'KEJURUAN',
    tingkat: '10',
    jurusan_id: 'prog-rpl',
  },
  {
    id: 'sub-016',
    kode: 'KK-RPL-11',
    nama: 'Konsentrasi Keahlian RPL',
    nama_singkat: 'KK-RPL',
    kelompok: 'KEJURUAN',
    tingkat: '11',
    jurusan_id: 'prog-rpl',
  },

  // MULOK base
  {
    id: 'sub-017',
    kode: 'MLBD-10',
    nama: 'Bahasa Sunda',
    nama_singkat: 'MLBD',
    kelompok: 'MULOK',
    tingkat: '10',
    jurusan_id: null,
  },
  {
    id: 'sub-018',
    kode: 'MLBD-11',
    nama: 'Bahasa Sunda',
    nama_singkat: 'MLBD',
    kelompok: 'MULOK',
    tingkat: '11',
    jurusan_id: null,
  },
  {
    id: 'sub-019',
    kode: 'MLBD-12',
    nama: 'Bahasa Sunda',
    nama_singkat: 'MLBD',
    kelompok: 'MULOK',
    tingkat: '12',
    jurusan_id: null,
  },

  // PILIHAN
  {
    id: 'sub-020',
    kode: 'KKA-10',
    nama: 'Koding dan Kecerdasan Artifisial',
    nama_singkat: 'KKA',
    kelompok: 'PILIHAN',
    tingkat: '10',
    jurusan_id: null,
  },
]

// ── Tambahan mapel spesifik tenant (opsional)
const TENANT_EXTRAS = {
  smknkawali: [],
  smkpasja: [],
  mtsmaarifjtr: [
    // MTs punya mapel khas: Bahasa Arab, Fiqih, dll (contoh)
    {
      id: 'sub-201',
      kode: 'BAR-7',
      nama: 'Bahasa Arab',
      nama_singkat: 'B.ARAB',
      kelompok: 'MULOK',
      tingkat: '7',
      jurusan_id: null,
    },
    {
      id: 'sub-202',
      kode: 'FIQ-7',
      nama: 'Fiqih',
      nama_singkat: 'FIQ',
      kelompok: 'MULOK',
      tingkat: '7',
      jurusan_id: null,
    },
  ],
  smpn1jatinangor: [],
  sman1cirebon: [],
}

// ── Public: grouped by tenant
export const mockSubjectsByTenant = Object.fromEntries(
  TENANT_SLUGS.map((tenant) => [
    tenant,
    [...BASE_SUBJECTS, ...(TENANT_EXTRAS[tenant] || [])].map((s) => ({
      ...s,
      tenant_slug: tenant,
    })),
  ]),
)

// ── Getter helpers
export const getSubjectsByTenant = (tenant) =>
  mockSubjectsByTenant[tenant] || mockSubjectsByTenant[DEFAULT_TENANT] || []

export const getAllSubjects = () => flattenTenants(mockSubjectsByTenant)

// ── Backward-compat: flat list (DEPRECATED) — dedup by id (ambil versi pertama)
const _flatDedup = (() => {
  const seen = new Map()
  getAllSubjects().forEach((s) => {
    if (!seen.has(s.id)) seen.set(s.id, s)
  })
  return Array.from(seen.values())
})()
export const mockSubjects = _flatDedup

export const mockSubjectsTemplateCSV =
  '\uFEFFkode,nama,nama_singkat,kelompok,tingkat,jurusan_kode\n' +
  'BIN-10,Bahasa Indonesia,B.IND,WAJIB,10,\n' +
  'MTK-10,Matematika,MTK,WAJIB,10,\n' +
  'DDK-TKJ-10,Dasar-Dasar Keahlian TKJ,DDK-TKJ,KEJURUAN,10,prog-tkj\n' +
  'MLBD-10,Bahasa Sunda,MLBD,MULOK,10,\n'
