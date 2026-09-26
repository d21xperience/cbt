// src/utils/pdf/cardTemplatePdf.js
// Template pdfmake untuk Kartu Ujian CR80.
// Layout: 2 kolom × 5 baris = 10 kartu / A4 portrait.
// Sisi depan: header (logo + teks + no. kartu) / identitas / footer (foto | ttd | QR).
// Sisi belakang: jadwal ujian (kode mapel, hari, tanggal, jam).

import pdfMake from 'pdfmake/build/pdfmake'
import * as pdfFonts from 'pdfmake/build/vfs_fonts'

if (pdfFonts?.pdfMake?.vfs) pdfMake.vfs = pdfFonts.pdfMake.vfs
else if (pdfFonts?.vfs) pdfMake.vfs = pdfFonts.vfs

// CR80 = 85.6 × 53.98 mm
const CARD_W = 242.6
const COLS = 2
const ROWS = 5
const PER_PAGE = COLS * ROWS
const H_GAP = 8
const V_GAP = 4

// ── Layout kartu depan (single table 3 baris)
// Garis hanya di: atas kartu, separator header↔isi (1 garis), bawah kartu.
// TIDAK ada garis antara isi dan footer.
const CARD_TABLE_LAYOUT = {
  hLineWidth: (i, node) => {
    if (i === 0) return 0.8 // garis atas
    if (i === 1) return 0.6 // separator header↔isi (satu-satunya)
    if (i === node.table.body.length) return 0.8 // garis bawah
    return 0 // tidak ada garis isi↔footer
  },
  vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 0.8 : 0),
  hLineColor: () => '#222',
  vLineColor: () => '#222',
  paddingLeft: () => 0,
  paddingRight: () => 0,
  paddingTop: () => 0,
  paddingBottom: () => 0,
}

const INNER_TABLE_LAYOUT = {
  hLineWidth: () => 0.3,
  vLineWidth: () => 0.3,
  hLineColor: () => '#999',
  vLineColor: () => '#999',
  paddingLeft: () => 3,
  paddingRight: () => 3,
  paddingTop: () => 2,
  paddingBottom: () => 2,
}

// ── Formatters
const fmtTanggal = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
const fmtHari = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { weekday: 'long' })
}
const fmtJam = (mulai, selesai) => {
  if (!mulai) return '-'
  return selesai ? `${mulai}–${selesai}` : mulai
}

export const buildQrUrl = (tenant, qrToken) => {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : `https://${tenant}.ujian.pw`
  return `${origin}/qr/${qrToken}`
}

export const buildSignatureQrUrl = (tenant, cardNumber, sigToken) => {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : `https://${tenant}.ujian.pw`
  return `${origin}/verify/card/${cardNumber}?h=${sigToken.slice(0, 8)}`
}

// ── Logo cell: image kalau ada, placeholder box kalau kosong
const buildLogoCell = (school) => {
  if (school.logo_url) {
    return {
      width: 26,
      image: school.logo_url,
      fit: [24, 24],
      alignment: 'center',
    }
  }
  return {
    width: 26,
    canvas: [
      {
        type: 'rect',
        x: 1,
        y: 0,
        w: 24,
        h: 24,
        r: 2,
        color: '#f0f0f0',
        lineWidth: 0.3,
        lineColor: '#bbb',
      },
    ],
  }
}

// ── ROW 1: Header
const buildHeaderRow = (card, school) => ({
  columns: [
    buildLogoCell(school),
    {
      width: '*',
      stack: [
        { text: 'KARTU LOGIN', fontSize: 7, bold: true, alignment: 'center' },
        { text: 'UJIAN TENGAH SEMESTER', fontSize: 6, alignment: 'center' },
        { text: school.nama || 'SEKOLAH', fontSize: 6.5, bold: true, alignment: 'center' },
        {
          text: school.alamat_jalan || school.alamat_kabupaten || '',
          fontSize: 5,
          alignment: 'center',
          color: '#555',
        },
      ],
      margin: [3, 0, 3, 0],
    },
    {
      width: 62,
      stack: [
        { text: `No. Kartu: ${card.card_number}`, fontSize: 5, color: '#666', alignment: 'right' },
      ],
    },
  ],
  columnGap: 3,
  margin: [3, 3, 3, 3],
})

// ── ROW 2: Identitas
const buildBodyRow = (card) => ({
  stack: [
    { text: `Nama Peserta : ${card.student_name}`, fontSize: 6.5, bold: true },
    {
      columns: [
        {
          width: '*',
          text: `NISN / NIS : ${card.student_nisn || '-'} / ${card.student_nis || '-'}`,
          fontSize: 5.5,
        },
        { width: '*', text: `Username : ${card.username || '-'}`, fontSize: 5.5 },
      ],
      margin: [0, 1, 0, 0],
    },
    {
      columns: [
        { width: '*', text: `Kelas : ${card.class_nama || '-'}`, fontSize: 5.5 },
        { width: '*', text: `Password : ${card.password || '-'}`, fontSize: 5.5 },
      ],
      margin: [0, 1, 0, 0],
    },
  ],
  margin: [3, 3, 3, 3],
})

// ── ROW 3: Footer (foto | ttd | QR) — semua vertical-align: bottom
const buildFooterRow = (card, school) => {
  const fotoCell = {
    width: 34,
    stack: [
      card.student_photo_url
        ? { image: card.student_photo_url, fit: [30, 40] }
        : {
            canvas: [
              {
                type: 'rect',
                x: 0,
                y: 0,
                w: 30,
                h: 40,
                color: '#f0f0f0',
                lineWidth: 0.4,
                lineColor: '#888',
              },
            ],
          },
    ],
    verticalAlign: 'bottom',
    alignment: 'center',
  }

  const ttdCell = {
    width: '*',
    stack: [
      { text: `Pada ${fmtTanggal(new Date().toISOString())}`, fontSize: 5, margin: [0, 0, 0, 1] },
      { text: 'Kepala,', fontSize: 5, margin: [0, 0, 0, 2] },
      {
        columns: [
          card.signatureQrDataUrl
            ? { image: card.signatureQrDataUrl, width: 22, height: 22 }
            : { text: '', width: 22 },
          {
            width: '*',
            stack: [
              {
                text: school.kepala_sekolah_nama || '-',
                fontSize: 5.5,
                bold: true,
                margin: [3, 6, 0, 0],
              },
              {
                text: `NIP. ${school.kepala_sekolah_nip || '-'}`,
                fontSize: 5,
                margin: [3, 0, 0, 0],
              },
            ],
          },
        ],
      },
    ],
    verticalAlign: 'bottom',
  }

  const qrCell = {
    width: 56,
    stack: [
      card.qrDataUrl
        ? { image: card.qrDataUrl, fit: [50, 50], alignment: 'center' }
        : { text: 'QR', fontSize: 6, alignment: 'center' },
      {
        text: 'Scan untuk login',
        fontSize: 4.5,
        alignment: 'center',
        color: '#666',
        margin: [0, 1, 0, 0],
      },
    ],
    verticalAlign: 'bottom',
    alignment: 'center',
  }

  return {
    table: {
      widths: [34, '*', 56],
      body: [[fotoCell, ttdCell, qrCell]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 3,
      paddingRight: () => 3,
      paddingTop: () => 19,
      paddingBottom: () =>0, // jarak konten dengan tepi bawah kartu
    },
  }
}

// ── Sisi depan = single table (3 baris, 3 garis saja)
const buildFrontCell = (card, school) => ({
  table: {
    widths: ['*'],
    body: [[buildHeaderRow(card, school)], [buildBodyRow(card)], [buildFooterRow(card, school)]],
  },
  layout: CARD_TABLE_LAYOUT,
})

// ── Sisi belakang: jadwal ujian
const buildBackCell = (card, exams = []) => {
  const myExams = exams.filter((e) => e.class_id === card.class_id)

  const headerRow = ['Kode', 'Mapel', 'Hari', 'Tanggal', 'Jam'].map((t) => ({
    text: t,
    fontSize: 5,
    bold: true,
    alignment: 'center',
    fillColor: '#e8e8e8',
    margin: [0, 1, 0, 1],
  }))

  const rows = myExams.length
    ? myExams.map((e) => [
        { text: e.subject_kode || '-', fontSize: 5, alignment: 'center' },
        { text: e.subject_nama || '-', fontSize: 5 },
        { text: fmtHari(e.tanggal), fontSize: 5, alignment: 'center' },
        { text: fmtTanggal(e.tanggal), fontSize: 5, alignment: 'center' },
        { text: fmtJam(e.jam_mulai, e.jam_selesai), fontSize: 5, alignment: 'center' },
      ])
    : [
        [
          {
            text: 'Belum ada jadwal',
            fontSize: 5,
            colSpan: 5,
            alignment: 'center',
            color: '#888',
          },
          '',
          '',
          '',
          '',
        ],
      ]

  const jadwalTable = {
    table: {
      headerRows: 1,
      widths: [24, '*', 40, 42, 40],
      body: [headerRow, ...rows],
    },
    layout: INNER_TABLE_LAYOUT,
  }

  return {
    table: {
      widths: ['*'],
      body: [
        [
          {
            stack: [
              { text: 'JADWAL UJIAN', fontSize: 6.5, bold: true, alignment: 'center' },
              {
                text: `${card.student_name} • ${card.class_nama}`,
                fontSize: 5.5,
                alignment: 'center',
                color: '#555',
                margin: [0, 1, 0, 3],
              },
              jadwalTable,
              {
                text: 'Hadir 15 menit sebelum ujian dimulai. Bawa kartu ini.',
                fontSize: 4.5,
                alignment: 'center',
                color: '#777',
                margin: [0, 3, 0, 0],
              },
            ],
            margin: [3, 3, 3, 3],
          },
        ],
      ],
    },
    layout: CARD_TABLE_LAYOUT,
  }
}

// ── MAIN
export const buildCardPdfDefinition = ({ cards = [], school = {}, tenant = '', exams = [] }) => {
  const pages = []
  for (let i = 0; i < cards.length; i += PER_PAGE) {
    pages.push(cards.slice(i, i + PER_PAGE))
  }

  const content = []

  pages.forEach((pageCards, pageIdx) => {
    if (pageIdx > 0) content.push({ text: '', pageBreak: 'before' })

    // ---- FRONT PAGE ----
    const frontRows = []
    for (let r = 0; r < ROWS; r++) {
      const left = pageCards[r * COLS]
      const right = pageCards[r * COLS + 1]
      frontRows.push({
        columns: [
          { width: CARD_W, ...(left ? buildFrontCell(left, school) : { text: '' }) },
          { width: H_GAP, text: '' },
          { width: CARD_W, ...(right ? buildFrontCell(right, school) : { text: '' }) },
        ],
        columnGap: 0,
        margin: [0, V_GAP, 0, V_GAP],
      })
    }
    content.push({ stack: frontRows })

    // ---- BACK PAGE (mirror kolom untuk duplex flip long-edge) ----
    content.push({ text: '', pageBreak: 'before' })
    const backRows = []
    for (let r = 0; r < ROWS; r++) {
      const left = pageCards[r * COLS]
      const right = pageCards[r * COLS + 1]
      backRows.push({
        columns: [
          { width: CARD_W, ...(right ? buildBackCell(right, exams) : { text: '' }) },
          { width: H_GAP, text: '' },
          { width: CARD_W, ...(left ? buildBackCell(left, exams) : { text: '' }) },
        ],
        columnGap: 0,
        margin: [0, V_GAP, 0, V_GAP],
      })
    }
    content.push({ stack: backRows })
  })

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [20, 20, 20, 40],
    defaultStyle: { fontSize: 6 },
    footer: (currentPage, pageCount) => ({
      columns: [
        {
          text: tenant ? `ujian.pw — ${tenant}` : 'ujian.pw',
          fontSize: 6,
          color: '#aaa',
          margin: [20, 0, 0, 0],
        },
        {
          text: `Hal ${currentPage}/${pageCount}`,
          fontSize: 6,
          color: '#aaa',
          alignment: 'right',
          margin: [0, 0, 20, 0],
        },
      ],
      margin: [0, 8, 0, 0],
    }),
    content,
  }
}

export const downloadCardPdf = (definition, filename = 'kartu-ujian.pdf') => {
  pdfMake.createPdf(definition).download(filename)
}

export const openCardPdf = (definition) => {
  pdfMake.createPdf(definition).open()
}
