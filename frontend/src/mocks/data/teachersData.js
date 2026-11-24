// src/mocks/data/teachersData.js
// Mock Master Guru — multi-tenant (grouped by tenant_slug).

import { DEFAULT_TENANT, flattenTenants } from './tenantHelpers'

const enrich = (tenant, list) => list.map((t) => ({ ...t, tenant_slug: tenant }))

const RAW_BY_TENANT = {
  // ═══════════════════════════════════════════════════
  // SMK NEGERI KAWALI (10 guru existing, email diupdate)
  // ═══════════════════════════════════════════════════
  smknkawali: [
    {
      id: 'tch-001',
      nip: '198001012005012001',
      nama: 'Mira Surtiningsih',
      email: 'mira@smknkawali.sch.id',
      username: 'mira',
      status: 'AKTIF',
      teaching_subject_ids: ['sub-005', 'sub-009'],
      is_homeroom: true,
      homeroom_class_id: 'cls-001',
      homeroom_class_nama: '10 IPA 1',
    },
    {
      id: 'tch-002',
      nip: '198102022006012002',
      nama: 'Sri Murti',
      email: 'sri@smknkawali.sch.id',
      username: 'sri',
      status: 'AKTIF',
      teaching_subject_ids: ['sub-005'],
      is_homeroom: true,
      homeroom_class_id: 'cls-002',
      homeroom_class_nama: '10 IPA 2',
    },
    {
      id: 'tch-003',
      nip: '198203032007012003',
      nama: 'Fia Sri Mulyati',
      email: 'fia@smknkawali.sch.id',
      username: 'fia',
      status: 'AKTIF',
      teaching_subject_ids: ['sub-004', 'sub-006'],
      is_homeroom: true,
      homeroom_class_id: 'cls-003',
      homeroom_class_nama: '11 IPA 1',
    },
    {
      id: 'tch-004',
      nip: '198304042008012004',
      nama: 'Ika Prasetya Ningsih',
      email: 'ika@smknkawali.sch.id',
      username: 'ika',
      status: 'AKTIF',
      teaching_subject_ids: ['sub-006'],
      is_homeroom: true,
      homeroom_class_id: 'cls-005',
      homeroom_class_nama: '12 IPA 1',
    },
    {
      id: 'tch-005',
      nip: '198405052009012005',
      nama: 'Ahmad Yani',
      email: 'ahmad@smknkawali.sch.id',
      username: 'ahmad',
      status: 'AKTIF',
      teaching_subject_ids: ['sub-009'],
      is_homeroom: true,
      homeroom_class_id: 'cls-007',
      homeroom_class_nama: 'X TKJ A',
    },
    {
      id: 'tch-006',
      nip: '198506062010012006',
      nama: 'Siti Aminah',
      email: 'siti@smknkawali.sch.id',
      username: 'siti',
      status: 'AKTIF',
      teaching_subject_ids: ['sub-005'],
      is_homeroom: true,
      homeroom_class_id: 'cls-009',
      homeroom_class_nama: 'XI RPL A',
    },
    {
      id: 'tch-007',
      nip: '198607072011012007',
      nama: 'Budi Santoso',
      email: 'budi@smknkawali.sch.id',
      username: 'budi',
      status: 'AKTIF',
      teaching_subject_ids: ['sub-005', 'sub-007'],
      is_homeroom: false,
      homeroom_class_id: null,
      homeroom_class_nama: null,
    },
    {
      id: 'tch-008',
      nip: '198708082012012008',
      nama: 'Dewi Lestari',
      email: 'dewi@smknkawali.sch.id',
      username: 'dewi',
      status: 'AKTIF',
      teaching_subject_ids: ['sub-006'],
      is_homeroom: false,
      homeroom_class_id: null,
      homeroom_class_nama: null,
    },
    {
      id: 'tch-009',
      nip: '198809092013012009',
      nama: 'Hadi Widodo',
      email: 'hadi@smknkawali.sch.id',
      username: 'hadi',
      status: 'AKTIF',
      teaching_subject_ids: ['sub-003'],
      is_homeroom: false,
      homeroom_class_id: null,
      homeroom_class_nama: null,
    },
    {
      id: 'tch-010',
      nip: '198910102014012010',
      nama: 'Nurul Hidayah',
      email: 'nurul@smknkawali.sch.id',
      username: 'nurul',
      status: 'NONAKTIF',
      teaching_subject_ids: [],
      is_homeroom: false,
      homeroom_class_id: null,
      homeroom_class_nama: null,
    },
  ],

  // ═══════════════════════════════════════════════════
  // SMK PASJA (3 guru baru — RPL/TKJ)
  // ═══════════════════════════════════════════════════
  smkpasja: [
    {
      id: 'tch-101',
      nip: '199001012015011001',
      nama: 'Ahmad Fauzi, S.Kom',
      email: 'ahmad.fauzi@smkpasja.sch.id',
      username: 'ahmadfauzi',
      status: 'AKTIF',
      teaching_subject_ids: ['sub-015', 'sub-016'],
      is_homeroom: true,
      homeroom_class_id: 'cls-101',
      homeroom_class_nama: 'X RPL 1',
    },
    {
      id: 'tch-102',
      nip: '199102022016012002',
      nama: 'Budi Hartono, S.T',
      email: 'budi.hartono@smkpasja.sch.id',
      username: 'budihartono',
      status: 'AKTIF',
      teaching_subject_ids: ['sub-013', 'sub-014'],
      is_homeroom: true,
      homeroom_class_id: 'cls-102',
      homeroom_class_nama: 'X TKJ 1',
    },
    {
      id: 'tch-103',
      nip: '199203032017012003',
      nama: 'Citra Ayu, S.Pd',
      email: 'citra.ayu@smkpasja.sch.id',
      username: 'citraayu',
      status: 'AKTIF',
      teaching_subject_ids: ['sub-005'],
      is_homeroom: false,
      homeroom_class_id: null,
      homeroom_class_nama: null,
    },
  ],

  // ═══════════════════════════════════════════════════
  // MTs MA'ARIF JATIREJO (2 guru baru)
  // ═══════════════════════════════════════════════════
  mtsmaarifjtr: [
    {
      id: 'tch-201',
      nip: '199304042018011004',
      nama: 'Ust. Ahmad Zaki, S.Pd.I',
      email: 'ahmad.zaki@mtsmaarifjtr.sch.id',
      username: 'zakizaki',
      status: 'AKTIF',
      teaching_subject_ids: ['sub-001'],
      is_homeroom: true,
      homeroom_class_id: 'cls-201',
      homeroom_class_nama: '7A',
    },
    {
      id: 'tch-202',
      nip: '199405052019012005',
      nama: 'Ustadzah Aminah, S.Ag',
      email: 'aminah@mtsmaarifjtr.sch.id',
      username: 'aminah',
      status: 'AKTIF',
      teaching_subject_ids: ['sub-001'],
      is_homeroom: true,
      homeroom_class_id: 'cls-202',
      homeroom_class_nama: '8A',
    },
  ],

  // ═══════════════════════════════════════════════════
  // SMP NEGERI 1 JATINANGOR (2 guru baru)
  // ═══════════════════════════════════════════════════
  smpn1jatinangor: [
    {
      id: 'tch-301',
      nip: '198806062014011006',
      nama: 'Dedi Kurniawan, S.Pd',
      email: 'dedi.kurniawan@smpn1jatinangor.sch.id',
      username: 'dedikurniawan',
      status: 'AKTIF',
      teaching_subject_ids: ['sub-004'],
      is_homeroom: true,
      homeroom_class_id: 'cls-301',
      homeroom_class_nama: '7A',
    },
    {
      id: 'tch-302',
      nip: '198907072015012007',
      nama: 'Rina Yuliana, S.Pd',
      email: 'rina.yuliana@smpn1jatinangor.sch.id',
      username: 'rinayuliana',
      status: 'AKTIF',
      teaching_subject_ids: ['sub-003'],
      is_homeroom: true,
      homeroom_class_id: 'cls-302',
      homeroom_class_nama: '8A',
    },
  ],

  // ═══════════════════════════════════════════════════
  // SMA NEGERI 1 CIREBON (2 guru baru)
  // ═══════════════════════════════════════════════════
  sman1cirebon: [
    {
      id: 'tch-401',
      nip: '197805052003012008',
      nama: 'Dra. Siti Fatimah',
      email: 'siti.fatimah@sman1cirebon.sch.id',
      username: 'sitifatimah',
      status: 'AKTIF',
      teaching_subject_ids: ['sub-004'],
      is_homeroom: true,
      homeroom_class_id: 'cls-401',
      homeroom_class_nama: 'X IPA 1',
    },
    {
      id: 'tch-402',
      nip: '198006062005011009',
      nama: 'Hendra Gunawan, M.Pd',
      email: 'hendra.gunawan@sman1cirebon.sch.id',
      username: 'hendragunawan',
      status: 'AKTIF',
      teaching_subject_ids: ['sub-004'],
      is_homeroom: true,
      homeroom_class_id: 'cls-402',
      homeroom_class_nama: 'XI IPA 1',
    },
  ],
}

// ── Public: grouped by tenant
export const mockTeachersByTenant = Object.fromEntries(
  Object.entries(RAW_BY_TENANT).map(([tenant, list]) => [tenant, enrich(tenant, list)]),
)

// ── Getter helpers
export const getTeachersByTenant = (tenant) =>
  mockTeachersByTenant[tenant] || mockTeachersByTenant[DEFAULT_TENANT] || []

export const getAllTeachers = () => flattenTenants(mockTeachersByTenant)

// ── Backward-compat: flat list (DEPRECATED)
export const mockTeachers = getAllTeachers()

export const mockTeachersTemplateCSV =
  '\uFEFFnip,nama,email,username,password,status\n' +
  '198001012005012011,Hendra Gunawan,hendra@smknkawali.sch.id,hendra,rahasia123,AKTIF\n' +
  '198102022006012012,Rina Wati,rina@smknkawali.sch.id,rina,rahasia123,AKTIF\n' +
  ',,Tanpa NIP,,,AKTIF\n'
