// src/mocks/data/classesData.js
// Mock Master Kelas/Rombel — CR-M2 draft.

export const mockClasses = [
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
    ruang_id: 'room-001', // ← TAMBAH
    ruang_nama: 'R01', // ← TAMBAH
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
    ruang_id: 'room-002', // ← TAMBAH
    ruang_nama: 'R02', // ← TAMBAH
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
    ruang_id: 'room-003', // ← TAMBAH
    ruang_nama: 'R03', // ← TAMBAH
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
    ruang_id: 'room-004', // ← TAMBAH
    ruang_nama: 'R04', // ← TAMBAH
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
    ruang_id: 'room-005', // ← TAMBAH
    ruang_nama: 'R05', // ← TAMBAH
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
    ruang_id: 'room-006', // ← TAMBAH
    ruang_nama: 'R06', // ← TAMBAH
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
    ruang_id: 'room-007', // ← TAMBAH
    ruang_nama: 'R07', // ← TAMBAH
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
    ruang_id: 'room-008', // ← TAMBAH
    ruang_nama: 'R08', // ← TAMBAH
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
    ruang_id: 'room-009', // ← TAMBAH
    ruang_nama: 'R09', // ← TAMBAH
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
    ruang_id: 'room-010', // ← TAMBAH
    ruang_nama: 'R10', // ← TAMBAH
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
    ruang_id: 'room-011', // ← TAMBAH
    ruang_nama: 'R11', // ← TAMBAH
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
    ruang_id: 'room-012', // ← TAMBAH
    ruang_nama: 'R12', // ← TAMBAH
  },
]

// ── Template CSV (UTF-8 BOM)
export const mockClassesTemplateCSV =
  '\uFEFFnama,tingkat,kurikulum,jenis_rombel,program_keahlian,wali_kelas_nama\n' +
  '10 IPA 3,10,K13,REGULER,,\n' +
  '10 IPS 1,10,K13,REGULER,,\n' +
  'XII RPL A,12,K13,REGULER,prog-rpl,Siti Aminah\n' +
  'XI TKJ B,11,MERDEKA,REGULER,prog-tkj,\n'
