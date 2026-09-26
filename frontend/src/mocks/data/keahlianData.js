// src/mocks/data/keahlianData.js
// Master Bidang & Program Keahlian — mirror dari VER-007/008 seed data.
// DILARANG diubah tanpa update VER-010 proposal + changelog frontend.
//
// Baseline: 10 bidang + 23 program (6 default) — sesuai migration 000017.

export const mockBidangKeahlian = [
  {
    id: 'TI',
    nama: 'Teknologi Informasi',
    deskripsi: '',
    sort_order: 1,
    created_at: '2026-09-20T00:00:00Z',
  },
  { id: 'OTO', nama: 'Otomotif', deskripsi: '', sort_order: 2, created_at: '2026-09-20T00:00:00Z' },
  {
    id: 'BISNIS',
    nama: 'Bisnis Manajemen',
    deskripsi: '',
    sort_order: 3,
    created_at: '2026-09-20T00:00:00Z',
  },
  {
    id: 'ELEKTRO',
    nama: 'Teknik Elektro',
    deskripsi: '',
    sort_order: 4,
    created_at: '2026-09-20T00:00:00Z',
  },
  {
    id: 'MESIN',
    nama: 'Teknik Mesin',
    deskripsi: '',
    sort_order: 5,
    created_at: '2026-09-20T00:00:00Z',
  },
  {
    id: 'BANGUNAN',
    nama: 'Teknik Bangunan',
    deskripsi: '',
    sort_order: 6,
    created_at: '2026-09-20T00:00:00Z',
  },
  {
    id: 'KESEHATAN',
    nama: 'Kesehatan',
    deskripsi: '',
    sort_order: 7,
    created_at: '2026-09-20T00:00:00Z',
  },
  {
    id: 'AGRI',
    nama: 'Agribisnis',
    deskripsi: '',
    sort_order: 8,
    created_at: '2026-09-20T00:00:00Z',
  },
  {
    id: 'PARIWISATA',
    nama: 'Pariwisata',
    deskripsi: '',
    sort_order: 9,
    created_at: '2026-09-20T00:00:00Z',
  },
  {
    id: 'SENI',
    nama: 'Seni & Ekonomi Kreatif',
    deskripsi: '',
    sort_order: 10,
    created_at: '2026-09-20T00:00:00Z',
  },
]

export const mockProgramKeahlian = [
  // TI
  {
    id: 'prog-tkj',
    bidang_id: 'TI',
    kode: 'TKJ',
    nama: 'Teknik Komputer dan Jaringan',
    is_default: true,
    is_custom: false,
    sort_order: 1,
  },
  {
    id: 'prog-rpl',
    bidang_id: 'TI',
    kode: 'RPL',
    nama: 'Rekayasa Perangkat Lunak',
    is_default: true,
    is_custom: false,
    sort_order: 2,
  },
  {
    id: 'prog-mm',
    bidang_id: 'TI',
    kode: 'MM',
    nama: 'Multimedia',
    is_default: false,
    is_custom: false,
    sort_order: 3,
  },
  {
    id: 'prog-tkj4',
    bidang_id: 'TI',
    kode: 'TKJ4',
    nama: 'Teknik Komputer Jaringan 4 Tahun',
    is_default: false,
    is_custom: false,
    sort_order: 4,
  },
  // OTO
  {
    id: 'prog-tkr',
    bidang_id: 'OTO',
    kode: 'TKR',
    nama: 'Teknik Kendaraan Ringan',
    is_default: true,
    is_custom: false,
    sort_order: 1,
  },
  {
    id: 'prog-tsm',
    bidang_id: 'OTO',
    kode: 'TSM',
    nama: 'Teknik Sepeda Motor',
    is_default: true,
    is_custom: false,
    sort_order: 2,
  },
  {
    id: 'prog-tbsm',
    bidang_id: 'OTO',
    kode: 'TBSM',
    nama: 'Teknik Bisnis Sepeda Motor',
    is_default: false,
    is_custom: false,
    sort_order: 3,
  },
  // BISNIS
  {
    id: 'prog-akl',
    bidang_id: 'BISNIS',
    kode: 'AKL',
    nama: 'Akuntansi Keuangan Lembaga',
    is_default: true,
    is_custom: false,
    sort_order: 1,
  },
  {
    id: 'prog-mplb',
    bidang_id: 'BISNIS',
    kode: 'MPLB',
    nama: 'Manajemen Perkantoran',
    is_default: true,
    is_custom: false,
    sort_order: 2,
  },
  {
    id: 'prog-bdp',
    bidang_id: 'BISNIS',
    kode: 'BDP',
    nama: 'Bisnis Daring Pemasaran',
    is_default: false,
    is_custom: false,
    sort_order: 3,
  },
  {
    id: 'prog-otkp',
    bidang_id: 'BISNIS',
    kode: 'OTKP',
    nama: 'Otomatisasi Tata Kelola Perkantoran',
    is_default: false,
    is_custom: false,
    sort_order: 4,
  },
  // ELEKTRO
  {
    id: 'prog-tav',
    bidang_id: 'ELEKTRO',
    kode: 'TAV',
    nama: 'Teknik Audio Video',
    is_default: false,
    is_custom: false,
    sort_order: 1,
  },
  {
    id: 'prog-tei',
    bidang_id: 'ELEKTRO',
    kode: 'TEI',
    nama: 'Teknik Elektronika Industri',
    is_default: false,
    is_custom: false,
    sort_order: 2,
  },
  // MESIN
  {
    id: 'prog-tpm',
    bidang_id: 'MESIN',
    kode: 'TPM',
    nama: 'Teknik Pemesinan',
    is_default: false,
    is_custom: false,
    sort_order: 1,
  },
  {
    id: 'prog-tflm',
    bidang_id: 'MESIN',
    kode: 'TFLM',
    nama: 'Teknik Pengelasan',
    is_default: false,
    is_custom: false,
    sort_order: 2,
  },
  // BANGUNAN
  {
    id: 'prog-dpib',
    bidang_id: 'BANGUNAN',
    kode: 'DPIB',
    nama: 'Desain Pemodelan Informasi Bangunan',
    is_default: false,
    is_custom: false,
    sort_order: 1,
  },
  {
    id: 'prog-tkp',
    bidang_id: 'BANGUNAN',
    kode: 'TKP',
    nama: 'Teknik Konstruksi & Properti',
    is_default: false,
    is_custom: false,
    sort_order: 2,
  },
  // KESEHATAN
  {
    id: 'prog-akf',
    bidang_id: 'KESEHATAN',
    kode: 'AKF',
    nama: 'Asisten Keperawatan',
    is_default: false,
    is_custom: false,
    sort_order: 1,
  },
  // AGRI
  {
    id: 'prog-atp',
    bidang_id: 'AGRI',
    kode: 'ATP',
    nama: 'Agribisnis Tanaman Pangan',
    is_default: false,
    is_custom: false,
    sort_order: 1,
  },
  {
    id: 'prog-aphp',
    bidang_id: 'AGRI',
    kode: 'APHP',
    nama: 'Agribisnis Pengolahan Hasil Pertanian',
    is_default: false,
    is_custom: false,
    sort_order: 2,
  },
  // PARIWISATA
  {
    id: 'prog-upw',
    bidang_id: 'PARIWISATA',
    kode: 'UPW',
    nama: 'Usaha Perjalanan Wisata',
    is_default: false,
    is_custom: false,
    sort_order: 1,
  },
  {
    id: 'prog-ph',
    bidang_id: 'PARIWISATA',
    kode: 'PH',
    nama: 'Perhotelan',
    is_default: false,
    is_custom: false,
    sort_order: 2,
  },
  // SENI
  {
    id: 'prog-dkv',
    bidang_id: 'SENI',
    kode: 'DKV',
    nama: 'Desain Komunikasi Visual',
    is_default: false,
    is_custom: false,
    sort_order: 1,
  },
]

// ── In-memory state: program assignment per tenant
// Di-mutasi oleh assign/remove. Reset via window.resetKeahlianMockData()
// export const buildInitialAssignments = () => ({
//   // Contoh: tenant smknkawali (SMK) punya TKJ + RPL
//   'tenant-smknkawali': ['prog-tkj', 'prog-rpl'],
//   // Tenant mtsmaarifjtr (MTs) — non-SMK, kosong
//   'tenant-mtsmaarifjtr': [],
//   // Tenant smkpasja (SMK)
//   'tenant-smkpasja': ['prog-tkj'],
// })

export const buildInitialAssignments = () => ({
  '550e8400-e29b-41d4-a716-446655440002': ['prog-tkj', 'prog-rpl'],
  '550e8400-e29b-41d4-a716-446655440003': [],
  '550e8400-e29b-41d4-a716-446655440001': ['prog-tkj'],
  '550e8400-e29b-41d4-a716-446655440004': [], // ← BARU: SMP (tidak ada program)
  '550e8400-e29b-41d4-a716-446655440005': [], // ← BARU: SMA (tidak ada program)
})

// Helper: enrich program with bidang_nama (mirror backend embedding)
export const enrichProgramWithBidang = (program) => {
  if (!program) return null
  const bidang = mockBidangKeahlian.find((b) => b.id === program.bidang_id)
  return {
    ...program,
    bidang_nama: bidang?.nama || '',
    created_by: program.created_by || '',
    deskripsi: program.deskripsi || '',
    created_at: program.created_at || '2026-09-20T00:00:00Z',
  }
}

// Deep clone helper
export const cloneMock = (v) => JSON.parse(JSON.stringify(v))
