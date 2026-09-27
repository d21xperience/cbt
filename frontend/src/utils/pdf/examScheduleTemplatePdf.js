// src/utils/pdf/examScheduleTemplatePdf.js
// Template pdfmake untuk Jadwal Ujian.
// Layout: header sekolah → section per TINGKAT → sub-section per HARI → table.

import pdfMake from 'pdfmake/build/pdfmake'
import * as pdfFonts from 'pdfmake/build/vfs_fonts'

if (pdfFonts?.pdfMake?.vfs) pdfMake.vfs = pdfFonts.pdfMake.vfs
else if (pdfFonts?.vfs) pdfMake.vfs = pdfFonts.vfs

const PAGE_W = 535 // A4 portrait minus margin 30px kiri-kanan

const fmtHari = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long' })
}
const fmtTanggal = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
const calcEndTime = (start, dur) => {
  if (!start || !dur) return '--:--'
  const [h, m] = String(start).split(':').map(Number)
  const total = h * 60 + m + Number(dur)
  const eh = Math.floor(total / 60) % 24
  const em = total % 60
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
}

export const buildExamSchedulePdfDefinition = ({
  schedules = [],
  school = {},
  tenant = '',
  filterJenis = null,
  filterTingkat = null,
  filterTanggal = null,
}) => {
  // ── Group: tingkat → tanggal → rows
  const grouped = {}
  schedules.forEach((s) => {
    if (filterTingkat && s.tingkat !== filterTingkat) return
    if (filterTanggal && s.tanggal !== filterTanggal) return
    if (!grouped[s.tingkat]) grouped[s.tingkat] = {}
    if (!grouped[s.tingkat][s.tanggal]) grouped[s.tingkat][s.tanggal] = []
    grouped[s.tingkat][s.tanggal].push(s)
  })

  const content = []

  // ── Header sekolah
  content.push({
    columns: [
      school.logo_url
        ? { width: 60, image: school.logo_url, fit: [55, 55] }
        : { width: 60, text: '' },
      {
        width: '*',
        stack: [
          { text: school.nama || 'SEKOLAH', fontSize: 14, bold: true, alignment: 'center' },
          {
            text: school.alamat_jalan || school.alamat_kabupaten || '',
            fontSize: 9,
            alignment: 'center',
            color: '#555',
          },
          { text: `NPSN: ${school.npsn || '-'}`, fontSize: 8, alignment: 'center', color: '#777' },
        ],
      },
      { width: 60, text: '' },
    ],
    margin: [0, 0, 0, 6],
  })

  content.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: PAGE_W, y2: 0, lineWidth: 1.5 }],
  })

  content.push({
    text: 'JADWAL UJIAN',
    fontSize: 14,
    bold: true,
    alignment: 'center',
    margin: [0, 12, 0, 2],
  })
  if (filterJenis) {
    content.push({
      text: filterJenis.nama || filterJenis.kode || '',
      fontSize: 11,
      alignment: 'center',
      margin: [0, 0, 0, 2],
    })
  }
  content.push({
    text: `Tahun Ajaran 2025/2026 — Semester Ganjil`,
    fontSize: 9,
    alignment: 'center',
    color: '#666',
    margin: [0, 0, 0, 14],
  })

  // ── Per tingkat
  const tingkats = Object.keys(grouped).sort()
  if (tingkats.length === 0) {
    content.push({
      text: 'Tidak ada jadwal sesuai filter.',
      fontSize: 10,
      alignment: 'center',
      color: '#888',
      margin: [0, 20, 0, 0],
    })
  }

  tingkats.forEach((tingkat, tIdx) => {
    if (tIdx > 0) content.push({ text: '', margin: [0, 12, 0, 0] })

    content.push({
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: `TINGKAT ${tingkat}`,
              fontSize: 11,
              bold: true,
              color: '#fff',
              alignment: 'center',
              fillColor: '#1976D2',
              margin: [0, 5, 0, 5],
            },
          ],
        ],
      },
      layout: 'noBorders',
    })

    const byTanggal = grouped[tingkat]
    const tanggals = Object.keys(byTanggal).sort()

    tanggals.forEach((tanggal) => {
      content.push({
        text: `${fmtHari(tanggal)}, ${fmtTanggal(tanggal)}`,
        fontSize: 10,
        bold: true,
        margin: [0, 10, 0, 4],
        color: '#333',
      })

      const rows = byTanggal[tanggal].sort((a, b) =>
        (a.jam_mulai || '').localeCompare(b.jam_mulai || ''),
      )

      const body = [
        [
          { text: 'No', fontSize: 9, bold: true, alignment: 'center', fillColor: '#f0f0f0' },
          { text: 'Jam', fontSize: 9, bold: true, alignment: 'center', fillColor: '#f0f0f0' },
          { text: 'Kode', fontSize: 9, bold: true, alignment: 'center', fillColor: '#f0f0f0' },
          { text: 'Mata Pelajaran', fontSize: 9, bold: true, fillColor: '#f0f0f0' },
          { text: 'Jurusan', fontSize: 9, bold: true, alignment: 'center', fillColor: '#f0f0f0' },
          { text: 'Durasi', fontSize: 9, bold: true, alignment: 'center', fillColor: '#f0f0f0' },
        ],
      ]
      rows.forEach((r, idx) => {
        body.push([
          { text: String(idx + 1), fontSize: 9, alignment: 'center' },
          {
            text: `${r.jam_mulai}–${calcEndTime(r.jam_mulai, r.durasi_menit)}`,
            fontSize: 9,
            alignment: 'center',
          },
          { text: r.subject_kode || '-', fontSize: 9, alignment: 'center' },
          { text: r.subject_nama || '-', fontSize: 9 },
          {
            text: r.jurusan_nama || 'Semua',
            fontSize: 9,
            alignment: 'center',
            color: r.jurusan_nama ? '#6A1B9A' : '#666',
          },
          { text: `${r.durasi_menit || 0} mnt`, fontSize: 9, alignment: 'center' },
        ])
      })

      content.push({
        table: {
          headerRows: 1,
          widths: [26, 78, 46, '*', 70, 48],
          body,
        },
        layout: {
          hLineWidth: () => 0.4,
          vLineWidth: () => 0.4,
          hLineColor: () => '#888',
          vLineColor: () => '#888',
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
      })
    })
  })

  // ── TTD Kepala Sekolah
  content.push({ text: '', margin: [0, 30, 0, 0] })
  content.push({
    columns: [
      { width: '*', text: '' },
      {
        width: 210,
        stack: [
          {
            text: `${school.alamat_kabupaten || ''}, ${fmtTanggal(new Date().toISOString())}`,
            fontSize: 9,
            alignment: 'center',
          },
          { text: 'Kepala Sekolah,', fontSize: 9, alignment: 'center', margin: [0, 2, 0, 40] },
          {
            text: school.kepala_sekolah_nama || '-',
            fontSize: 10,
            bold: true,
            alignment: 'center',
            decoration: 'underline',
          },
          {
            text: `NIP. ${school.kepala_sekolah_nip || '-'}`,
            fontSize: 8,
            alignment: 'center',
            margin: [0, 1, 0, 0],
          },
        ],
      },
    ],
  })

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [30, 30, 30, 40],
    defaultStyle: { fontSize: 9 },
    footer: (currentPage, pageCount) => ({
      columns: [
        {
          text: tenant ? `ujian.pw — ${tenant}` : 'ujian.pw',
          fontSize: 7,
          color: '#aaa',
          margin: [30, 0, 0, 0],
        },
        {
          text: `Hal ${currentPage}/${pageCount}`,
          fontSize: 7,
          color: '#aaa',
          alignment: 'right',
          margin: [0, 0, 30, 0],
        },
      ],
      margin: [0, 8, 0, 0],
    }),
    content,
  }
}

export const openExamSchedulePdf = (def) => pdfMake.createPdf(def).open()
export const downloadExamSchedulePdf = (def, filename = 'jadwal-ujian.pdf') =>
  pdfMake.createPdf(def).download(filename)
