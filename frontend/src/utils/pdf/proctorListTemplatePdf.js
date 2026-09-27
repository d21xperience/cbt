// src/utils/pdf/proctorListTemplatePdf.js
// Template pdfmake untuk Daftar Pengawas Ujian.
// Landscape A4, flat table sort jam, kolom ruang + mapel + pengawas 1&2 + TTD.

import pdfMake from 'pdfmake/build/pdfmake'
import * as pdfFonts from 'pdfmake/build/vfs_fonts'

if (pdfFonts?.pdfMake?.vfs) pdfMake.vfs = pdfFonts.pdfMake.vfs
else if (pdfFonts?.vfs) pdfMake.vfs = pdfFonts.vfs

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

export const buildProctorListPdfDefinition = ({
  rows = [],
  school = {},
  tenant = '',
  filterJenis = null,
  filterTanggal = null,
  filterRuang = null,
  ketuaPanitia = '',
}) => {
  const content = []

  // ── HEADER SEKOLAH
  content.push({
    columns: [
      school.logo_url
        ? { width: 60, image: school.logo_url, fit: [55, 55] }
        : { width: 60, text: '' },
      {
        width: '*',
        stack: [
          { text: school.nama || 'SEKOLAH', fontSize: 13, bold: true, alignment: 'center' },
          {
            text: school.alamat_jalan || school.alamat_kabupaten || '',
            fontSize: 8,
            alignment: 'center',
            color: '#555',
          },
          { text: `NPSN: ${school.npsn || '-'}`, fontSize: 7, alignment: 'center', color: '#777' },
        ],
      },
      { width: 60, text: '' },
    ],
    margin: [0, 0, 0, 4],
  })

  content.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 782, y2: 0, lineWidth: 1.5 }],
  })

  content.push({
    text: 'DAFTAR PENGAWAS UJIAN',
    fontSize: 13,
    bold: true,
    alignment: 'center',
    margin: [0, 10, 0, 2],
  })
  if (filterJenis) {
    content.push({
      text: filterJenis.nama || filterJenis.kode || '',
      fontSize: 10,
      alignment: 'center',
      margin: [0, 0, 0, 2],
    })
  }
  content.push({
    text: `Tahun Ajaran 2025/2026 — Semester Ganjil`,
    fontSize: 8,
    alignment: 'center',
    color: '#666',
    margin: [0, 0, 0, 2],
  })
  if (filterTanggal) {
    content.push({
      text: `Hari: ${fmtHari(filterTanggal)}, ${fmtTanggal(filterTanggal)}${filterRuang ? ` — Ruang: ${filterRuang}` : ''}`,
      fontSize: 9,
      alignment: 'center',
      bold: true,
      margin: [0, 0, 0, 10],
    })
  } else {
    content.push({ text: '', margin: [0, 0, 0, 6] })
  }

  // ── TABLE
  if (rows.length === 0) {
    content.push({
      text: 'Tidak ada jadwal yang sesuai filter.',
      fontSize: 10,
      alignment: 'center',
      color: '#888',
      margin: [0, 20, 0, 0],
    })
  } else {
    const body = [
      [
        { text: 'No', fontSize: 8, bold: true, alignment: 'center', fillColor: '#e8e8e8' },
        { text: 'Ruang', fontSize: 8, bold: true, alignment: 'center', fillColor: '#e8e8e8' },
        { text: 'Kelas', fontSize: 8, bold: true, fillColor: '#e8e8e8' },
        { text: 'Mata Pelajaran', fontSize: 8, bold: true, fillColor: '#e8e8e8' },
        { text: 'Jam', fontSize: 8, bold: true, alignment: 'center', fillColor: '#e8e8e8' },
        { text: 'Pengawas 1', fontSize: 8, bold: true, fillColor: '#e8e8e8' },
        { text: 'Pengawas 2', fontSize: 8, bold: true, fillColor: '#e8e8e8' },
        {
          text: 'Tanda Tangan',
          fontSize: 8,
          bold: true,
          alignment: 'center',
          fillColor: '#e8e8e8',
        },
      ],
    ]

    rows.forEach((r, idx) => {
      body.push([
        { text: String(idx + 1), fontSize: 8, alignment: 'center' },
        { text: r.ruang_nama || '-', fontSize: 8, alignment: 'center' },
        { text: r.class_nama || '-', fontSize: 8 },
        { text: r.subject_nama || '-', fontSize: 8 },
        {
          text: `${r.jam_mulai}–${calcEndTime(r.jam_mulai, r.durasi_menit)}`,
          fontSize: 8,
          alignment: 'center',
        },
        r.pengawas_namas?.[0]
          ? { text: r.pengawas_namas[0], fontSize: 8 }
          : { text: 'Belum di-assign', fontSize: 7, italics: true, color: '#999' },
        r.pengawas_namas?.[1]
          ? { text: r.pengawas_namas[1], fontSize: 8 }
          : { text: 'Belum di-assign', fontSize: 7, italics: true, color: '#999' },
        { text: '..........', fontSize: 8, alignment: 'center', color: '#aaa' },
      ])
    })

    content.push({
      table: {
        headerRows: 1,
        widths: [24, 46, 100, 145, 80, 110, 110, 100],
        body,
        dontBreakRows: true,
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
  }

  // ── TTD (2 kolom)
  content.push({ text: '', margin: [0, 30, 0, 0] })
  content.push({
    columns: [
      { width: '*', text: '' },
      {
        width: 230,
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
      { width: 30, text: '' },
      {
        width: 230,
        stack: [
          { text: ' ', fontSize: 9, alignment: 'center' },
          { text: 'Ketua Panitia,', fontSize: 9, alignment: 'center', margin: [0, 2, 0, 40] },
          {
            text: ketuaPanitia || '____________________',
            fontSize: 10,
            bold: !!ketuaPanitia,
            alignment: 'center',
            decoration: ketuaPanitia ? 'underline' : null,
          },
          {
            text: ketuaPanitia ? 'NIP. -' : '',
            fontSize: 8,
            alignment: 'center',
            margin: [0, 1, 0, 0],
          },
        ],
      },
      { width: '*', text: '' },
    ],
  })

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [30, 30, 30, 30],
    defaultStyle: { fontSize: 8 },
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

export const openProctorListPdf = (def) => pdfMake.createPdf(def).open()
export const downloadProctorListPdf = (def, filename = 'daftar-pengawas.pdf') =>
  pdfMake.createPdf(def).download(filename)
