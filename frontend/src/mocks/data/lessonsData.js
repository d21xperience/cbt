// src/mocks/data/lessonsData.js
// Mock Master Pembelajaran — multi-tenant.

import { DEFAULT_TENANT, flattenTenants } from './tenantHelpers'

const enrich = (tenant, list) => list.map((l) => ({ ...l, tenant_slug: tenant }))

// ── RAW data per tenant
// Referensi: subject_id (mockSubjectsByTenant), class_id (mockClassesByTenant), teacher_id (mockTeachersByTenant)
const RAW_BY_TENANT = {
  // ═══════════════════════════════════════════════════
  // SMK NEGERI KAWALI — 3 existing lessons
  // ═══════════════════════════════════════════════════
  smknkawali: [
    {
      id: 'lsn-001',
      subject_id: 'sub-005',
      subject_kode: 'MTK',
      subject_nama: 'Matematika',
      class_id: 'cls-001',
      class_nama: '10 IPA 1',
      teacher_id: 'tch-001',
      teacher_nama: 'Mira Surtiningsih',
      academic_year: '2025/2026',
      semester: 'GANJIL',
    },
    {
      id: 'lsn-002',
      subject_id: 'sub-004',
      subject_kode: 'BIN',
      subject_nama: 'Bahasa Indonesia',
      class_id: 'cls-001',
      class_nama: '10 IPA 1',
      teacher_id: 'tch-003',
      teacher_nama: 'Fia Sri Mulyati',
      academic_year: '2025/2026',
      semester: 'GANJIL',
    },
    {
      id: 'lsn-003',
      subject_id: 'sub-006',
      subject_kode: 'BING',
      subject_nama: 'Bahasa Inggris',
      class_id: 'cls-001',
      class_nama: '10 IPA 1',
      teacher_id: 'tch-004',
      teacher_nama: 'Ika Prasetya Ningsih',
      academic_year: '2025/2026',
      semester: 'GANJIL',
    },
  ],

  // ═══════════════════════════════════════════════════
  // SMK PASJA — 2 lessons
  // ═══════════════════════════════════════════════════
  smkpasja: [
    {
      id: 'lsn-101',
      subject_id: 'sub-015',
      subject_kode: 'DDK-RPL-10',
      subject_nama: 'Dasar-Dasar Keahlian RPL',
      class_id: 'cls-101',
      class_nama: 'X RPL 1',
      teacher_id: 'tch-101',
      teacher_nama: 'Ahmad Fauzi, S.Kom',
      academic_year: '2025/2026',
      semester: 'GANJIL',
    },
    {
      id: 'lsn-102',
      subject_id: 'sub-013',
      subject_kode: 'DDK-TKJ-10',
      subject_nama: 'Dasar-Dasar Keahlian TKJ',
      class_id: 'cls-102',
      class_nama: 'X TKJ 1',
      teacher_id: 'tch-102',
      teacher_nama: 'Budi Hartono, S.T',
      academic_year: '2025/2026',
      semester: 'GANJIL',
    },
  ],

  // ═══════════════════════════════════════════════════
  // MTs MA'ARIF JATIREJO — 1 lesson
  // ═══════════════════════════════════════════════════
  mtsmaarifjtr: [
    {
      id: 'lsn-201',
      subject_id: 'sub-201',
      subject_kode: 'BAR-7',
      subject_nama: 'Bahasa Arab',
      class_id: 'cls-201',
      class_nama: '7A',
      teacher_id: 'tch-201',
      teacher_nama: 'Ust. Ahmad Zaki, S.Pd.I',
      academic_year: '2025/2026',
      semester: 'GANJIL',
    },
  ],

  // ═══════════════════════════════════════════════════
  // SMP NEGERI 1 JATINANGOR — 1 lesson
  // ═══════════════════════════════════════════════════
  smpn1jatinangor: [
    {
      id: 'lsn-301',
      subject_id: 'sub-004',
      subject_kode: 'MTK-10',
      subject_nama: 'Matematika',
      class_id: 'cls-301',
      class_nama: '7A',
      teacher_id: 'tch-301',
      teacher_nama: 'Dedi Kurniawan, S.Pd',
      academic_year: '2025/2026',
      semester: 'GANJIL',
    },
  ],

  // ═══════════════════════════════════════════════════
  // SMA NEGERI 1 CIREBON — 1 lesson
  // ═══════════════════════════════════════════════════
  sman1cirebon: [
    {
      id: 'lsn-401',
      subject_id: 'sub-004',
      subject_kode: 'MTK-10',
      subject_nama: 'Matematika',
      class_id: 'cls-401',
      class_nama: 'X IPA 1',
      teacher_id: 'tch-401',
      teacher_nama: 'Dra. Siti Fatimah',
      academic_year: '2025/2026',
      semester: 'GANJIL',
    },
  ],
}

// ── Public: grouped by tenant
export const mockLessonsByTenant = Object.fromEntries(
  Object.entries(RAW_BY_TENANT).map(([tenant, list]) => [tenant, enrich(tenant, list)]),
)

// ── Getter helpers
export const getLessonsByTenant = (tenant) =>
  mockLessonsByTenant[tenant] || mockLessonsByTenant[DEFAULT_TENANT] || []

export const getAllLessons = () => flattenTenants(mockLessonsByTenant)

// ── Backward-compat: flat
export const mockLessons = getAllLessons()

// ── Template CSV (sama untuk semua tenant)
export const mockLessonsTemplateCSV =
  '\uFEFFmapel_kode,kelas_nama,guru_username,academic_year,semester\n' +
  'MTK-10,10 IPA 1,mira,2025/2026,GANJIL\n' +
  'BIN-10,10 IPA 1,fia,2025/2026,GANJIL\n'
