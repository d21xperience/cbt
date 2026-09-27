// src/mocks/data/roomsData.js
// Mock Master Ruang Ujian — Fase 2b-3-jadwal-1.

export const mockRooms = [
  {
    id: 'room-001',
    nama: 'R01',
    gedung: 'Gedung A',
    lantai: 1,
    kapasitas: 32,
    keterangan: 'Ruang kelas 10 IPA 1',
    aktif: true,
  },
  {
    id: 'room-002',
    nama: 'R02',
    gedung: 'Gedung A',
    lantai: 1,
    kapasitas: 32,
    keterangan: 'Ruang kelas 10 IPA 2',
    aktif: true,
  },
  {
    id: 'room-003',
    nama: 'R03',
    gedung: 'Gedung A',
    lantai: 2,
    kapasitas: 30,
    keterangan: 'Ruang kelas 11 IPA 1',
    aktif: true,
  },
  {
    id: 'room-004',
    nama: 'R04',
    gedung: 'Gedung A',
    lantai: 2,
    kapasitas: 30,
    keterangan: 'Ruang kelas 11 IPS 1',
    aktif: true,
  },
  {
    id: 'room-005',
    nama: 'R05',
    gedung: 'Gedung B',
    lantai: 1,
    kapasitas: 30,
    keterangan: 'Ruang kelas 12 IPA 1',
    aktif: true,
  },
  {
    id: 'room-006',
    nama: 'R06',
    gedung: 'Gedung B',
    lantai: 1,
    kapasitas: 30,
    keterangan: 'Ruang kelas 12 IPS 1',
    aktif: true,
  },
  {
    id: 'room-007',
    nama: 'R07',
    gedung: 'Gedung B',
    lantai: 2,
    kapasitas: 32,
    keterangan: 'Ruang kelas X TKJ A',
    aktif: true,
  },
  {
    id: 'room-008',
    nama: 'R08',
    gedung: 'Gedung B',
    lantai: 2,
    kapasitas: 32,
    keterangan: 'Ruang kelas X TKJ B',
    aktif: true,
  },
  {
    id: 'room-009',
    nama: 'R09',
    gedung: 'Gedung C',
    lantai: 1,
    kapasitas: 30,
    keterangan: 'Ruang kelas XI RPL A',
    aktif: true,
  },
  {
    id: 'room-010',
    nama: 'R10',
    gedung: 'Gedung C',
    lantai: 1,
    kapasitas: 30,
    keterangan: 'Ruang kelas XII TKJ A',
    aktif: true,
  },
  {
    id: 'room-011',
    nama: 'R11',
    gedung: 'Gedung C',
    lantai: 2,
    kapasitas: 28,
    keterangan: 'Ruang kelas X AKL 1',
    aktif: true,
  },
  {
    id: 'room-012',
    nama: 'R12',
    gedung: 'Gedung C',
    lantai: 2,
    kapasitas: 28,
    keterangan: 'Ruang kelas XI MPLB',
    aktif: true,
  },
  {
    id: 'room-lab-01',
    nama: 'LAB-TKJ-01',
    gedung: 'Gedung Lab',
    lantai: 1,
    kapasitas: 32,
    keterangan: 'Lab Komputer TKJ',
    aktif: true,
  },
  {
    id: 'room-lab-02',
    nama: 'LAB-RPL-01',
    gedung: 'Gedung Lab',
    lantai: 1,
    kapasitas: 30,
    keterangan: 'Lab Komputer RPL',
    aktif: true,
  },
  {
    id: 'room-lab-03',
    nama: 'LAB-AKL-01',
    gedung: 'Gedung Lab',
    lantai: 2,
    kapasitas: 28,
    keterangan: 'Lab Akuntansi',
    aktif: true,
  },
]

export const mockRoomsTemplateCSV =
  '\uFEFFnama,gedung,lantai,kapasitas,keterangan\n' +
  'R13,Gedung A,3,30,Ruang kelas tambahan\n' +
  'LAB-IPA-01,Gedung Lab,1,24,Lab IPA\n'

export const resetRoomsMockData = () => {
  // No-op — rooms state di-reset di handler
}
