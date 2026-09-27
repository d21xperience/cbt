// src/mocks/data/beritaAcaraTemplateData.js
// Mock Master Template Berita Acara — per tenant.

export const mockBeritaAcaraTemplates = {
  smkpasja: {
    id: 'ba-tpl-smkpasja',
    header: {
      judul: 'BERITA ACARA',
      subjudul_1: 'PENYELENGGARAAN UJIAN',
      subjudul_2: 'TAHUN PELAJARAN 2025/2026',
    },
    paragraf_pembuka:
      '<p>Pada hari ini <b>............</b> tanggal <b>............</b> bulan <b>............</b> tahun <b>............</b> telah diselenggarakan <b>UJIAN</b> tahun pelajaran <b>............</b>, Mata Pelajaran <b>............</b> kelas <b>............</b> dilaksanakan dari pukul <b>............</b> sampai dengan pukul <b>............</b> di ruang <b>............</b>.</p>',
    statistik: {
      enabled: true,
      label_peserta: 'Jumlah Peserta, seharusnya',
      label_hadir: 'Yang hadir',
      label_tidak_hadir: 'Yang tidak hadir',
    },
    paragraf_sampul:
      '<p>Telah dibuka sampul Ujian dengan disaksikan oleh para peserta, berisi lembar soal sebanyak <b>.......</b> eksemplar, lembar jawaban sebanyak <b>.......</b> eksemplar, berita acara sebanyak <b>.......</b> eksemplar.</p>',
    paragraf_kondisi: '<p>Sebelum dibuka Sampul Ujian tersebut dalam keadaan baik.</p>',
    checklist_kejadian: [
      { id: 'c1', label: 'Kecurangan', enabled: true },
      { id: 'c2', label: 'Peserta sakit', enabled: true },
      { id: 'c3', label: 'Izin keluar ruangan', enabled: true },
      { id: 'c4', label: 'Listrik padam / kendala teknis', enabled: true },
      { id: 'c5', label: 'Lainnya', enabled: true },
    ],
    label_catatan: 'Catatan selama pelaksanaan Ujian:',
    tampilkan_daftar_siswa: true,
    tampilkan_ttd_pengawas: true,
    tampilkan_ttd_kepala: true,
    tampilkan_ttd_panitia: true,
    updated_at: '2026-09-27T00:00:00Z',
  },
  smknkawali: {
    id: 'ba-tpl-smknkawali',
    header: {
      judul: 'BERITA ACARA',
      subjudul_1: 'PENYELENGGARAAN UJIAN SEKOLAH',
      subjudul_2: 'TAHUN PELAJARAN 2025/2026',
    },
    paragraf_pembuka:
      '<p>Pada hari ini <b>............</b> tanggal <b>............</b> bulan <b>............</b> tahun <b>............</b> telah diselenggarakan <b>UJIAN SEKOLAH</b> tahun pelajaran <b>............</b>, Mata Pelajaran <b>............</b> kelas <b>............</b> dilaksanakan dari pukul <b>............</b> sampai dengan pukul <b>............</b> di ruang <b>............</b>.</p>',
    statistik: {
      enabled: true,
      label_peserta: 'Jumlah Peserta, seharusnya',
      label_hadir: 'Yang hadir',
      label_tidak_hadir: 'Yang tidak hadir',
    },
    paragraf_sampul:
      '<p>Telah dibuka sampul Ujian dengan disaksikan oleh para peserta, berisi lembar soal sebanyak <b>.......</b> eksemplar, lembar jawaban sebanyak <b>.......</b> eksemplar, berita acara sebanyak <b>.......</b> eksemplar.</p>',
    paragraf_kondisi: '<p>Sebelum dibuka Sampul Ujian tersebut dalam keadaan baik.</p>',
    checklist_kejadian: [
      { id: 'c1', label: 'Kecurangan', enabled: true },
      { id: 'c2', label: 'Peserta sakit', enabled: true },
      { id: 'c3', label: 'Izin keluar ruangan', enabled: true },
      { id: 'c4', label: 'Listrik padam / kendala teknis', enabled: true },
      { id: 'c5', label: 'Lainnya', enabled: true },
    ],
    label_catatan: 'Catatan selama pelaksanaan Ujian:',
    tampilkan_daftar_siswa: true,
    tampilkan_ttd_pengawas: true,
    tampilkan_ttd_kepala: true,
    tampilkan_ttd_panitia: true,
    updated_at: '2026-09-27T00:00:00Z',
  },
}

const DEFAULT_SLUG = 'smkpasja'

export const resolveTemplate = (slug) => {
  const s = String(slug || DEFAULT_SLUG).toLowerCase()
  return mockBeritaAcaraTemplates[s] || mockBeritaAcaraTemplates[DEFAULT_SLUG]
}

export const defaultChecklistItem = (idx) => ({
  id: `c${Date.now()}-${idx}`,
  label: 'Kejadian baru',
  enabled: true,
})

export const resetBeritaAcaraTemplateMockData = () => {
  // no-op — state per-instance di handler
}
