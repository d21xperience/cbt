// src/mocks/data/roomsData.js
// Mock Master Ruang Ujian — multi-tenant (grouped by tenant_slug).

import { DEFAULT_TENANT, flattenTenants } from './tenantHelpers'

const enrich = (tenant, list) =>
  list.map((r) => ({ ...r, tenant_slug: tenant }))

const RAW_BY_TENANT = {
  // ═══════════════════════════════════════════════════
  // SMK NEGERI KAWALI (15 ruang existing)
  // ═══════════════════════════════════════════════════
  smknkawali: [
    { id: 'room-001', nama: 'R01', gedung: 'Gedung A', lantai: 1, kapasitas: 32, keterangan: 'Ruang kelas 10 IPA 1', aktif: true },
    { id: 'room-002', nama: 'R02', gedung: 'Gedung A', lantai: 1, kapasitas: 32, keterangan: 'Ruang kelas 10 IPA 2', aktif: true },
    { id: 'room-003', nama: 'R03', gedung: 'Gedung A', lantai: 2, kapasitas: 30, keterangan: 'Ruang kelas 11 IPA 1', aktif: true },
    { id: 'room-004', nama: 'R04', gedung: 'Gedung A', lantai: 2, kapasitas: 30, keterangan: 'Ruang kelas 11 IPS 1', aktif: true },
    { id: 'room-005', nama: 'R05', gedung: 'Gedung B', lantai: 1, kapasitas: 30, keterangan: 'Ruang kelas 12 IPA 1', aktif: true },
    { id: 'room-006', nama: 'R06', gedung: 'Gedung B', lantai: 1, kapasitas: 30, keterangan: 'Ruang kelas 12 IPS 1', aktif: true },
    { id: 'room-007', nama: 'R07', gedung: 'Gedung B', lantai: 2, kapasitas: 32, keterangan: 'Ruang kelas X TKJ A', aktif: true },
    { id: 'room-008', nama: 'R08', gedung: 'Gedung B', lantai: 2, kapasitas: 32, keterangan: 'Ruang kelas X TKJ B', aktif: true },
    { id: 'room-009', nama: 'R09', gedung: 'Gedung C', lantai: 1, kapasitas: 30, keterangan: 'Ruang kelas XI RPL A', aktif: true },
    { id: 'room-010', nama: 'R10', gedung: 'Gedung C', lantai: 1, kapasitas: 30, keterangan: 'Ruang kelas XII TKJ A', aktif: true },
    { id: 'room-011', nama: 'R11', gedung: 'Gedung C', lantai: 2, kapasitas: 28, keterangan: 'Ruang kelas X AKL 1', aktif: true },
    { id: 'room-012', nama: 'R12', gedung: 'Gedung C', lantai: 2, kapasitas: 28, keterangan: 'Ruang kelas XI MPLB', aktif: true },
    { id: 'room-lab-01', nama: 'LAB-TKJ-01', gedung: 'Gedung Lab', lantai: 1, kapasitas: 32, keterangan: 'Lab Komputer TKJ', aktif: true },
    { id: 'room-lab-02', nama: 'LAB-RPL-01', gedung: 'Gedung Lab', lantai: 1, kapasitas: 30, keterangan: 'Lab Komputer RPL', aktif: true },
    { id: 'room-lab-03', nama: 'LAB-AKL-01', gedung: 'Gedung Lab', lantai: 2, kapasitas: 28, keterangan: 'Lab Akuntansi', aktif: true },
  ],

  // ═══════════════════════════════════════════════════
  // SMK PASJA (2 ruang baru)
  // ═══════════════════════════════════════════════════
  smkpasja: [
    { id: 'room-101', nama: 'RPL-01', gedung: 'Gedung A', lantai: 1, kapasitas: 32, keterangan: 'Ruang kelas X RPL 1', aktif: true },
    { id: 'room-102', nama: 'TKJ-01', gedung: 'Gedung A', lantai: 1, kapasitas: 32, keterangan: 'Ruang kelas X TKJ 1', aktif: true },
  ],

  // ═══════════════════════════════════════════════════
  // MTs MA'ARIF JATIREJO (2 ruang baru)
  // ═══════════════════════════════════════════════════
  mtsmaarifjtr: [
    { id: 'room-201', nama: '7A', gedung: 'Gedung Utama', lantai: 1, kapasitas: 32, keterangan: 'Ruang kelas 7A', aktif: true },
    { id: 'room-202', nama: '8A', gedung: 'Gedung Utama', lantai: 1, kapasitas: 32, keterangan: 'Ruang kelas 8A', aktif: true },
  ],

  // ═══════════════════════════════════════════════════
  // SMP NEGERI 1 JATINANGOR (2 ruang baru)
  // ═══════════════════════════════════════════════════
  smpn1jatinangor: [
    { id: 'room-301', nama: '7A', gedung: 'Gedung A', lantai: 1, kapasitas: 32, keterangan: 'Ruang kelas 7A', aktif: true },
    { id: 'room-302', nama: '8A', gedung: 'Gedung A', lantai: 2, kapasitas: 32, keterangan: 'Ruang kelas 8A', aktif: true },
  ],

  // ═══════════════════════════════════════════════════
  // SMA NEGERI 1 CIREBON (2 ruang baru)
  // ═══════════════════════════════════════════════════
  sman1cirebon: [
    { id: 'room-401', nama: 'X-IPA-1', gedung: 'Gedung A', lantai: 1, kapasitas: 36, keterangan: 'Ruang kelas X IPA 1', aktif: true },
    { id: 'room-402', nama: 'XI-IPA-1', gedung: 'Gedung A', lantai: 2, kapasitas: 36, keterangan: 'Ruang kelas XI IPA 1', aktif: true },
  ],
}

// ── Public: grouped by tenant
export const mockRoomsByTenant = Object.fromEntries(
  Object.entries(RAW_BY_TENANT).map(([tenant, list]) => [tenant, enrich(tenant, list)]),
)

// ── Getter helpers
export const getRoomsByTenant = (tenant) =>
  mockRoomsByTenant[tenant] || mockRoomsByTenant[DEFAULT_TENANT] || []

export const getAllRooms = () => flattenTenants(mockRoomsByTenant)

// ── Backward-compat: flat list (DEPRECATED)
export const mockRooms = getAllRooms()

export const mockRoomsTemplateCSV =
  '\uFEFFnama,gedung,lantai,kapasitas,keterangan\n' +
  'R13,Gedung A,3,30,Ruang kelas tambahan\n' +
  'LAB-IPA-01,Gedung Lab,1,24,Lab IPA\n'

export const resetRoomsMockData = () => {
  // No-op — rooms state di-reset di handler
}
