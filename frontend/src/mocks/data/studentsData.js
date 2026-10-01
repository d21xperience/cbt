// src/mocks/data/studentsData.js
// Mock Master Siswa — multi-tenant (grouped by tenant_slug).
// Source of truth: Data Referensi → Siswa per tenant.
import { deriveExamPassword } from './passwordUtils'
import { DEFAULT_TENANT, flattenTenants } from './tenantHelpers'

// ── Helper lokal: enrich exam_password dari NIS + inject tenant_slug
const enrich = (tenant, list) =>
  list.map((s) => ({
    ...s,
    tenant_slug: tenant,
    exam_password: s.exam_password || deriveExamPassword(s.nis),
  }))

// ── RAW data per tenant
const RAW_BY_TENANT = {
  // ═══════════════════════════════════════════════════
  // SMK NEGERI KAWALI (baseline — existing 15 siswa)
  // ═══════════════════════════════════════════════════
  smknkawali: [
    {
      id: 'std-001',
      nisn: '1234500001',
      nis: '2024001',
      nama: 'Ahmad Fauzi',
      jenis_kelamin: 'L',
      tanggal_lahir: '2008-03-15',
      kelas_id: 'cls-001',
      kelas_nama: '10 IPA 1',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-002',
      nisn: '1234500002',
      nis: '2024002',
      nama: 'Siti Nurhaliza',
      jenis_kelamin: 'P',
      tanggal_lahir: '2008-05-22',
      kelas_id: 'cls-001',
      kelas_nama: '10 IPA 1',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-003',
      nisn: '1234500003',
      nis: '2024003',
      nama: 'Budi Santoso',
      jenis_kelamin: 'L',
      tanggal_lahir: '2008-07-10',
      kelas_id: 'cls-002',
      kelas_nama: '10 IPA 2',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-004',
      nisn: '1234500004',
      nis: '2024004',
      nama: 'Dewi Lestari',
      jenis_kelamin: 'P',
      tanggal_lahir: '2008-01-08',
      kelas_id: 'cls-002',
      kelas_nama: '10 IPA 2',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-005',
      nisn: '1234500005',
      nis: '2024005',
      nama: 'Eka Pratama',
      jenis_kelamin: 'L',
      tanggal_lahir: '2007-11-12',
      kelas_id: 'cls-003',
      kelas_nama: '11 IPA 1',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-006',
      nisn: '1234500006',
      nis: '2024006',
      nama: 'Fajar Nugroho',
      jenis_kelamin: 'L',
      tanggal_lahir: '2007-09-25',
      kelas_id: 'cls-003',
      kelas_nama: '11 IPA 1',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-007',
      nisn: '1234500007',
      nis: '2024007',
      nama: 'Gita Sari',
      jenis_kelamin: 'P',
      tanggal_lahir: '2007-04-18',
      kelas_id: 'cls-004',
      kelas_nama: '11 IPS 1',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-008',
      nisn: '1234500008',
      nis: '2024008',
      nama: 'Hadi Widodo',
      jenis_kelamin: 'L',
      tanggal_lahir: '2006-12-03',
      kelas_id: 'cls-005',
      kelas_nama: '12 IPA 1',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-009',
      nisn: '1234500009',
      nis: '2024009',
      nama: 'Ika Prasetyo',
      jenis_kelamin: 'P',
      tanggal_lahir: '2006-08-14',
      kelas_id: 'cls-005',
      kelas_nama: '12 IPA 1',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-010',
      nisn: '1234500010',
      nis: '2024010',
      nama: 'Joko Susilo',
      jenis_kelamin: 'L',
      tanggal_lahir: '2008-06-20',
      kelas_id: 'cls-007',
      kelas_nama: 'X TKJ A',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-011',
      nisn: '1234500011',
      nis: '2024011',
      nama: 'Kartika Sari',
      jenis_kelamin: 'P',
      tanggal_lahir: '2008-02-11',
      kelas_id: 'cls-007',
      kelas_nama: 'X TKJ A',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-012',
      nisn: '1234500012',
      nis: '2024012',
      nama: 'Lukman Hakim',
      jenis_kelamin: 'L',
      tanggal_lahir: '2007-10-05',
      kelas_id: 'cls-009',
      kelas_nama: 'XI RPL A',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-013',
      nisn: '1234500013',
      nis: '2024013',
      nama: 'Maya Anggraini',
      jenis_kelamin: 'P',
      tanggal_lahir: '2007-07-19',
      kelas_id: 'cls-009',
      kelas_nama: 'XI RPL A',
      status: 'NONAKTIF',
      photo_url: null,
    },
    {
      id: 'std-014',
      nisn: '1234500014',
      nis: '2024014',
      nama: 'Nanda Pratama',
      jenis_kelamin: 'L',
      tanggal_lahir: '2006-05-30',
      kelas_id: 'cls-010',
      kelas_nama: 'XII TKJ A',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-015',
      nisn: '1234500015',
      nis: '2024015',
      nama: 'Oktaviani Putri',
      jenis_kelamin: 'P',
      tanggal_lahir: '2008-11-22',
      kelas_id: 'cls-011',
      kelas_nama: 'X AKL 1',
      status: 'AKTIF',
      photo_url: null,
    },
  ],

  // ═══════════════════════════════════════════════════
  // SMK PASJA (3 siswa baru — SMK, RPL/TKJ)
  // ═══════════════════════════════════════════════════
  smkpasja: [
    {
      id: 'std-101',
      nisn: '2234500001',
      nis: '2024001',
      nama: 'Rangga Wijaya',
      jenis_kelamin: 'L',
      tanggal_lahir: '2008-04-10',
      kelas_id: 'cls-101',
      kelas_nama: 'X RPL 1',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-102',
      nisn: '2234500002',
      nis: '2024002',
      nama: 'Sinta Maharani',
      jenis_kelamin: 'P',
      tanggal_lahir: '2008-06-15',
      kelas_id: 'cls-101',
      kelas_nama: 'X RPL 1',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-103',
      nisn: '2234500003',
      nis: '2024003',
      nama: 'Bayu Setiawan',
      jenis_kelamin: 'L',
      tanggal_lahir: '2008-09-20',
      kelas_id: 'cls-102',
      kelas_nama: 'X TKJ 1',
      status: 'AKTIF',
      photo_url: null,
    },
  ],

  // ═══════════════════════════════════════════════════
  // MTs MA'ARIF JATIREJO (3 siswa baru — tingkat 7-9)
  // ═══════════════════════════════════════════════════
  mtsmaarifjtr: [
    {
      id: 'std-201',
      nisn: '3234500001',
      nis: '2024001',
      nama: 'Aisyah Rahma',
      jenis_kelamin: 'P',
      tanggal_lahir: '2011-03-12',
      kelas_id: 'cls-201',
      kelas_nama: '7A',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-202',
      nisn: '3234500002',
      nis: '2024002',
      nama: 'Faiz Abdullah',
      jenis_kelamin: 'L',
      tanggal_lahir: '2011-07-18',
      kelas_id: 'cls-201',
      kelas_nama: '7A',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-203',
      nisn: '3234500003',
      nis: '2024003',
      nama: 'Zahra Amelia',
      jenis_kelamin: 'P',
      tanggal_lahir: '2010-11-05',
      kelas_id: 'cls-202',
      kelas_nama: '8A',
      status: 'AKTIF',
      photo_url: null,
    },
  ],

  // ═══════════════════════════════════════════════════
  // SMP NEGERI 1 JATINANGOR (3 siswa baru — tingkat 7-9)
  // ═══════════════════════════════════════════════════
  smpn1jatinangor: [
    {
      id: 'std-301',
      nisn: '4234500001',
      nis: '2024001',
      nama: 'Dika Ramadhan',
      jenis_kelamin: 'L',
      tanggal_lahir: '2011-01-22',
      kelas_id: 'cls-301',
      kelas_nama: '7A',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-302',
      nisn: '4234500002',
      nis: '2024002',
      nama: 'Nadia Putri',
      jenis_kelamin: 'P',
      tanggal_lahir: '2011-05-14',
      kelas_id: 'cls-301',
      kelas_nama: '7A',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-303',
      nisn: '4234500003',
      nis: '2024003',
      nama: 'Reza Fadillah',
      jenis_kelamin: 'L',
      tanggal_lahir: '2010-10-08',
      kelas_id: 'cls-302',
      kelas_nama: '8A',
      status: 'AKTIF',
      photo_url: null,
    },
  ],

  // ═══════════════════════════════════════════════════
  // SMA NEGERI 1 CIREBON (3 siswa baru — tingkat 10-12)
  // ═══════════════════════════════════════════════════
  sman1cirebon: [
    {
      id: 'std-401',
      nisn: '5234500001',
      nis: '2024001',
      nama: 'Aditya Nugraha',
      jenis_kelamin: 'L',
      tanggal_lahir: '2008-02-28',
      kelas_id: 'cls-401',
      kelas_nama: 'X IPA 1',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-402',
      nisn: '5234500002',
      nis: '2024002',
      nama: 'Citra Melati',
      jenis_kelamin: 'P',
      tanggal_lahir: '2008-08-17',
      kelas_id: 'cls-401',
      kelas_nama: 'X IPA 1',
      status: 'AKTIF',
      photo_url: null,
    },
    {
      id: 'std-403',
      nisn: '5234500003',
      nis: '2024003',
      nama: 'Galih Prasetyo',
      jenis_kelamin: 'L',
      tanggal_lahir: '2007-12-09',
      kelas_id: 'cls-402',
      kelas_nama: 'XI IPA 1',
      status: 'AKTIF',
      photo_url: null,
    },
  ],
}

// ── Public: grouped by tenant (source of truth)
export const mockStudentsByTenant = Object.fromEntries(
  Object.entries(RAW_BY_TENANT).map(([tenant, list]) => [tenant, enrich(tenant, list)]),
)

// ── Getter helpers
export const getStudentsByTenant = (tenant) =>
  mockStudentsByTenant[tenant] || mockStudentsByTenant[DEFAULT_TENANT] || []

export const getAllStudents = () => flattenTenants(mockStudentsByTenant)

// ── Backward-compat: flat list (DEPRECATED — akan dihapus setelah F0.5c)
export const mockStudents = getAllStudents()

// ── Template CSV (sama untuk semua tenant)
export const mockStudentsTemplateCSV =
  '\uFEFFnisn,nis,nama,jenis_kelamin,tanggal_lahir,kelas\n' +
  '1234500101,2024101,Rizky Pratama,L,2008-01-15,10 IPA 1\n' +
  '1234500102,2024102,Sari Dewi,P,2008-03-20,10 IPA 1\n' +
  '1234500103,,Tanpa Kelas,L,2008-05-10,\n'
