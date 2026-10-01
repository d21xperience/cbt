// src/mocks/data/classesData.js
// Mock Master Kelas/Rombel — multi-tenant (grouped by tenant_slug).

import { DEFAULT_TENANT, flattenTenants } from './tenantHelpers'

// ── Helper lokal: inject tenant_slug
const enrich = (tenant, list) => list.map((c) => ({ ...c, tenant_slug: tenant }))

// ── RAW data per tenant
const RAW_BY_TENANT = {
  // ═══════════════════════════════════════════════════
  // SMK NEGERI KAWALI (baseline — existing 12 kelas)
  // ═══════════════════════════════════════════════════
  smknkawali: [
    {
      id: 'cls-001',
      nama: '10 IPA 1',
      tingkat: '10',
      kurikulum: 'K13',
      jenis_rombel: 'REGULER',
      program_keahlian_id: null,
      wali_kelas_id: 'tch-001',
      wali_kelas_nama: 'Mira Surtiningsih',
      jumlah_siswa: 24,
      ruang_id: 'room-001',
      ruang_nama: 'R01',
    },
    {
      id: 'cls-002',
      nama: '10 IPA 2',
      tingkat: '10',
      kurikulum: 'K13',
      jenis_rombel: 'REGULER',
      program_keahlian_id: null,
      wali_kelas_id: 'tch-002',
      wali_kelas_nama: 'Sri Murti',
      jumlah_siswa: 23,
      ruang_id: 'room-002',
      ruang_nama: 'R02',
    },
    {
      id: 'cls-003',
      nama: '11 IPA 1',
      tingkat: '11',
      kurikulum: 'K13',
      jenis_rombel: 'REGULER',
      program_keahlian_id: null,
      wali_kelas_id: 'tch-003',
      wali_kelas_nama: 'Fia Sri Mulyati',
      jumlah_siswa: 22,
      ruang_id: 'room-003',
      ruang_nama: 'R03',
    },
    {
      id: 'cls-004',
      nama: '11 IPS 1',
      tingkat: '11',
      kurikulum: 'K13',
      jenis_rombel: 'REGULER',
      program_keahlian_id: null,
      wali_kelas_id: null,
      wali_kelas_nama: null,
      jumlah_siswa: 26,
      ruang_id: 'room-004',
      ruang_nama: 'R04',
    },
    {
      id: 'cls-005',
      nama: '12 IPA 1',
      tingkat: '12',
      kurikulum: 'K13',
      jenis_rombel: 'REGULER',
      program_keahlian_id: null,
      wali_kelas_id: 'tch-004',
      wali_kelas_nama: 'Ika Prasetya Ningsih',
      jumlah_siswa: 21,
      ruang_id: 'room-005',
      ruang_nama: 'R05',
    },
    {
      id: 'cls-006',
      nama: '12 IPS 1',
      tingkat: '12',
      kurikulum: 'K13',
      jenis_rombel: 'REGULER',
      program_keahlian_id: null,
      wali_kelas_id: null,
      wali_kelas_nama: null,
      jumlah_siswa: 25,
      ruang_id: 'room-006',
      ruang_nama: 'R06',
    },
    {
      id: 'cls-007',
      nama: 'X TKJ A',
      tingkat: '10',
      kurikulum: 'K13',
      jenis_rombel: 'REGULER',
      program_keahlian_id: 'prog-tkj',
      wali_kelas_id: 'tch-005',
      wali_kelas_nama: 'Ahmad Yani',
      jumlah_siswa: 32,
      ruang_id: 'room-007',
      ruang_nama: 'R07',
    },
    {
      id: 'cls-008',
      nama: 'X TKJ B',
      tingkat: '10',
      kurikulum: 'K13',
      jenis_rombel: 'REGULER',
      program_keahlian_id: 'prog-tkj',
      wali_kelas_id: null,
      wali_kelas_nama: null,
      jumlah_siswa: 30,
      ruang_id: 'room-008',
      ruang_nama: 'R08',
    },
    {
      id: 'cls-009',
      nama: 'XI RPL A',
      tingkat: '11',
      kurikulum: 'MERDEKA',
      jenis_rombel: 'REGULER',
      program_keahlian_id: 'prog-rpl',
      wali_kelas_id: 'tch-006',
      wali_kelas_nama: 'Siti Aminah',
      jumlah_siswa: 28,
      ruang_id: 'room-009',
      ruang_nama: 'R09',
    },
    {
      id: 'cls-010',
      nama: 'XII TKJ A',
      tingkat: '12',
      kurikulum: 'K13',
      jenis_rombel: 'REGULER',
      program_keahlian_id: 'prog-tkj',
      wali_kelas_id: null,
      wali_kelas_nama: null,
      jumlah_siswa: 29,
      ruang_id: 'room-010',
      ruang_nama: 'R10',
    },
    {
      id: 'cls-011',
      nama: 'X AKL 1',
      tingkat: '10',
      kurikulum: 'K13',
      jenis_rombel: 'REGULER',
      program_keahlian_id: 'prog-akl',
      wali_kelas_id: null,
      wali_kelas_nama: null,
      jumlah_siswa: 27,
      ruang_id: 'room-011',
      ruang_nama: 'R11',
    },
    {
      id: 'cls-012',
      nama: 'XI MPLB',
      tingkat: '11',
      kurikulum: 'K13',
      jenis_rombel: 'PILIHAN',
      program_keahlian_id: 'prog-mplb',
      wali_kelas_id: null,
      wali_kelas_nama: null,
      jumlah_siswa: 18,
      ruang_id: 'room-012',
      ruang_nama: 'R12',
    },
  ],

  // ═══════════════════════════════════════════════════
  // SMK PASJA (2 kelas baru)
  // ═══════════════════════════════════════════════════
  smkpasja: [
    {
      id: 'cls-101',
      nama: 'X RPL 1',
      tingkat: '10',
      kurikulum: 'MERDEKA',
      jenis_rombel: 'REGULER',
      program_keahlian_id: 'prog-rpl',
      wali_kelas_id: 'tch-101',
      wali_kelas_nama: 'Ahmad Fauzi, S.Kom',
      jumlah_siswa: 2,
      ruang_id: 'room-101',
      ruang_nama: 'RPL-01',
    },
    {
      id: 'cls-102',
      nama: 'X TKJ 1',
      tingkat: '10',
      kurikulum: 'MERDEKA',
      jenis_rombel: 'REGULER',
      program_keahlian_id: 'prog-tkj',
      wali_kelas_id: 'tch-102',
      wali_kelas_nama: 'Budi Hartono, S.T',
      jumlah_siswa: 1,
      ruang_id: 'room-102',
      ruang_nama: 'TKJ-01',
    },
  ],

  // ═══════════════════════════════════════════════════
  // MTs MA'ARIF JATIREJO (2 kelas baru — tingkat 7-9)
  // ═══════════════════════════════════════════════════
  mtsmaarifjtr: [
    {
      id: 'cls-201',
      nama: '7A',
      tingkat: '7',
      kurikulum: 'K13',
      jenis_rombel: 'REGULER',
      program_keahlian_id: null,
      wali_kelas_id: 'tch-201',
      wali_kelas_nama: 'Ust. Ahmad Zaki',
      jumlah_siswa: 2,
      ruang_id: 'room-201',
      ruang_nama: '7A',
    },
    {
      id: 'cls-202',
      nama: '8A',
      tingkat: '8',
      kurikulum: 'K13',
      jenis_rombel: 'REGULER',
      program_keahlian_id: null,
      wali_kelas_id: 'tch-202',
      wali_kelas_nama: 'Ustadzah Aminah',
      jumlah_siswa: 1,
      ruang_id: 'room-202',
      ruang_nama: '8A',
    },
  ],

  // ═══════════════════════════════════════════════════
  // SMP NEGERI 1 JATINANGOR (2 kelas baru — tingkat 7-9)
  // ═══════════════════════════════════════════════════
  smpn1jatinangor: [
    {
      id: 'cls-301',
      nama: '7A',
      tingkat: '7',
      kurikulum: 'MERDEKA',
      jenis_rombel: 'REGULER',
      program_keahlian_id: null,
      wali_kelas_id: 'tch-301',
      wali_kelas_nama: 'Dedi Kurniawan, S.Pd',
      jumlah_siswa: 2,
      ruang_id: 'room-301',
      ruang_nama: '7A',
    },
    {
      id: 'cls-302',
      nama: '8A',
      tingkat: '8',
      kurikulum: 'MERDEKA',
      jenis_rombel: 'REGULER',
      program_keahlian_id: null,
      wali_kelas_id: 'tch-302',
      wali_kelas_nama: 'Rina Yuliana, S.Pd',
      jumlah_siswa: 1,
      ruang_id: 'room-302',
      ruang_nama: '8A',
    },
  ],

  // ═══════════════════════════════════════════════════
  // SMA NEGERI 1 CIREBON (2 kelas baru — tingkat 10-12)
  // ═══════════════════════════════════════════════════
  sman1cirebon: [
    {
      id: 'cls-401',
      nama: 'X IPA 1',
      tingkat: '10',
      kurikulum: 'MERDEKA',
      jenis_rombel: 'REGULER',
      program_keahlian_id: null,
      wali_kelas_id: 'tch-401',
      wali_kelas_nama: 'Dra. Siti Fatimah',
      jumlah_siswa: 2,
      ruang_id: 'room-401',
      ruang_nama: 'X-IPA-1',
    },
    {
      id: 'cls-402',
      nama: 'XI IPA 1',
      tingkat: '11',
      kurikulum: 'MERDEKA',
      jenis_rombel: 'REGULER',
      program_keahlian_id: null,
      wali_kelas_id: 'tch-402',
      wali_kelas_nama: 'Hendra Gunawan, M.Pd',
      jumlah_siswa: 1,
      ruang_id: 'room-402',
      ruang_nama: 'XI-IPA-1',
    },
  ],
}

// ── Public: grouped by tenant (source of truth)
export const mockClassesByTenant = Object.fromEntries(
  Object.entries(RAW_BY_TENANT).map(([tenant, list]) => [tenant, enrich(tenant, list)]),
)

// ── Getter helpers
export const getClassesByTenant = (tenant) =>
  mockClassesByTenant[tenant] || mockClassesByTenant[DEFAULT_TENANT] || []

export const getAllClasses = () => flattenTenants(mockClassesByTenant)

// ── Backward-compat: flat list (DEPRECATED — akan dihapus setelah F0.5c)
export const mockClasses = getAllClasses()

// ── Template CSV (UTF-8 BOM)
export const mockClassesTemplateCSV =
  '\uFEFFnama,tingkat,kurikulum,jenis_rombel,program_keahlian,wali_kelas_nama\n' +
  '10 IPA 3,10,K13,REGULER,,\n' +
  '10 IPS 1,10,K13,REGULER,,\n' +
  'XII RPL A,12,K13,REGULER,prog-rpl,Siti Aminah\n' +
  'XI TKJ B,11,MERDEKA,REGULER,prog-tkj,\n'
