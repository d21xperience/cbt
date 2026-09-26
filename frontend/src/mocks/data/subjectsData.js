// src/mocks/data/subjectsData.js
// Mock Master Mata Pelajaran — schema baru (Batch M3-rev).
//
// ATURAN (per Permendikdasmen 13/2025):
//   - Kelompok: WAJIB | PILIHAN | MULOK | KEJURUAN
//   - tingkat: 7/8/9 (SMP/MTs) atau 10/11/12/13 (SMA/MA/SMK/MAK)
//   - jurusan_id: hanya untuk kelompok KEJURUAN (SMK/MAK)

export const mockSubjects = [
  // ── WAJIB (berlaku semua jurusan, per tingkat)
  { id: 'sub-001', kode: 'PAIBP-10', nama: 'Pendidikan Agama Islam dan Budi Pekerti', nama_singkat: 'PAIBP', kelompok: 'WAJIB', tingkat: '10', jurusan_id: null },
  { id: 'sub-002', kode: 'PPKN-10',  nama: 'Pendidikan Pancasila dan Kewarganegaraan',  nama_singkat: 'PPKn',  kelompok: 'WAJIB', tingkat: '10', jurusan_id: null },
  { id: 'sub-003', kode: 'BIN-10',   nama: 'Bahasa Indonesia',                          nama_singkat: 'B.IND', kelompok: 'WAJIB', tingkat: '10', jurusan_id: null },
  { id: 'sub-004', kode: 'MTK-10',   nama: 'Matematika',                                nama_singkat: 'MTK',   kelompok: 'WAJIB', tingkat: '10', jurusan_id: null },
  { id: 'sub-005', kode: 'BING-10',  nama: 'Bahasa Inggris',                            nama_singkat: 'B.ING', kelompok: 'WAJIB', tingkat: '10', jurusan_id: null },

  { id: 'sub-006', kode: 'PAIBP-11', nama: 'Pendidikan Agama Islam dan Budi Pekerti',  nama_singkat: 'PAIBP', kelompok: 'WAJIB', tingkat: '11', jurusan_id: null },
  { id: 'sub-007', kode: 'PPKN-11',  nama: 'Pendidikan Pancasila dan Kewarganegaraan', nama_singkat: 'PPKn',  kelompok: 'WAJIB', tingkat: '11', jurusan_id: null },
  { id: 'sub-008', kode: 'BIN-11',   nama: 'Bahasa Indonesia',                          nama_singkat: 'B.IND', kelompok: 'WAJIB', tingkat: '11', jurusan_id: null },
  { id: 'sub-009', kode: 'MTK-11',   nama: 'Matematika',                                nama_singkat: 'MTK',   kelompok: 'WAJIB', tingkat: '11', jurusan_id: null },
  { id: 'sub-010', kode: 'BING-11',  nama: 'Bahasa Inggris',                            nama_singkat: 'B.ING', kelompok: 'WAJIB', tingkat: '11', jurusan_id: null },

  { id: 'sub-011', kode: 'BIN-12',   nama: 'Bahasa Indonesia',                          nama_singkat: 'B.IND', kelompok: 'WAJIB', tingkat: '12', jurusan_id: null },
  { id: 'sub-012', kode: 'MTK-12',   nama: 'Matematika',                                nama_singkat: 'MTK',   kelompok: 'WAJIB', tingkat: '12', jurusan_id: null },

  // ── KEJURUAN (SMK/MAK) — per jurusan
  { id: 'sub-013', kode: 'DDK-TKJ-10', nama: 'Dasar-Dasar Keahlian TKJ',       nama_singkat: 'DDK-TKJ', kelompok: 'KEJURUAN', tingkat: '10', jurusan_id: 'prog-tkj' },
  { id: 'sub-014', kode: 'KK-TKJ-11',  nama: 'Konsentrasi Keahlian TKJ',      nama_singkat: 'KK-TKJ',  kelompok: 'KEJURUAN', tingkat: '11', jurusan_id: 'prog-tkj' },
  { id: 'sub-015', kode: 'DDK-RPL-10', nama: 'Dasar-Dasar Keahlian RPL',      nama_singkat: 'DDK-RPL', kelompok: 'KEJURUAN', tingkat: '10', jurusan_id: 'prog-rpl' },
  { id: 'sub-016', kode: 'KK-RPL-11',  nama: 'Konsentrasi Keahlian RPL',      nama_singkat: 'KK-RPL',  kelompok: 'KEJURUAN', tingkat: '11', jurusan_id: 'prog-rpl' },

  // ── MULOK
  { id: 'sub-017', kode: 'MLBD-10', nama: 'Bahasa Sunda', nama_singkat: 'MLBD', kelompok: 'MULOK', tingkat: '10', jurusan_id: null },
  { id: 'sub-018', kode: 'MLBD-11', nama: 'Bahasa Sunda', nama_singkat: 'MLBD', kelompok: 'MULOK', tingkat: '11', jurusan_id: null },
  { id: 'sub-019', kode: 'MLBD-12', nama: 'Bahasa Sunda', nama_singkat: 'MLBD', kelompok: 'MULOK', tingkat: '12', jurusan_id: null },

  // ── PILIHAN
  { id: 'sub-020', kode: 'KKA-10', nama: 'Koding dan Kecerdasan Artifisial', nama_singkat: 'KKA', kelompok: 'PILIHAN', tingkat: '10', jurusan_id: null },
]

export const mockSubjectsTemplateCSV =
  '\uFEFFkode,nama,nama_singkat,kelompok,tingkat,jurusan_kode\n' +
  'BIN-10,Bahasa Indonesia,B.IND,WAJIB,10,\n' +
  'MTK-10,Matematika,MTK,WAJIB,10,\n' +
  'DDK-TKJ-10,Dasar-Dasar Keahlian TKJ,DDK-TKJ,KEJURUAN,10,prog-tkj\n' +
  'MLBD-10,Bahasa Sunda,MLBD,MULOK,10,\n'
