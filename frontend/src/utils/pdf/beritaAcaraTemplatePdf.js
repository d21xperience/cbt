// src/utils/pdf/beritaAcaraTemplatePdf.js
// Template pdfmake untuk lembar isian Berita Acara Ujian.
// Portrait A4. Auto-fill data jadwal; blank untuk input manual pengawas.

import pdfMake from 'pdfmake/build/pdfmake'
import * as pdfFonts from 'pdfmake/build/vfs_fonts'

if (pdfFonts?.pdfMake?.vfs) pdfMake.vfs = pdfFonts.pdfMake.vfs
else if (pdfFonts?.vfs) pdfMake.vfs = pdfFonts.vfs

// ── Helpers
const fmtHari = (dateStr) => {
  if (!dateStr) return '............'
  return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long' })
}
const fmtTanggalAngka = (dateStr) => {
  if (!dateStr) return '............'
  return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit' })
}
const fmtBulan = (dateStr) => {
  if (!dateStr) return '............'
  return new Date(dateStr).toLocaleDateString('id-ID', { month: 'long' })
}
const fmtTahun = (dateStr) => {
  if (!dateStr) return '............'
  return String(new Date(dateStr).getFullYear())
}
const fmtTanggalLengkap = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
const calcEndTime = (start, dur) => {
  if (!start || !dur) return '............'
  const [h, m] = String(start).split(':').map(Number)
  const total = h * 60 + m + Number(dur)
  const eh = Math.floor(total / 60) % 24
  const em = total % 60
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
}

// ── HTML → pdfmake text array (paragraf)
const htmlToLines = (html) => {
  if (!html) return [{ text: '', fontSize: 10 }]
  // Ubah </p> jadi marker paragraf
  let s = String(html)
    .replace(/<\s*\/p\s*>/gi, '\n\n')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*p[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '') // strip remaining tags (bold, italic, dll)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

  const paras = s
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  if (paras.length === 0) return [{ text: '', fontSize: 10 }]

  return paras.map((p, idx) => ({
    text: p,
    fontSize: 10,
    lineHeight: 1.4,
    alignment: 'justify',
    margin: [0, idx === 0 ? 0 : 6, 0, 0],
  }))
}

// ── Auto-fill paragraf dengan data jadwal (replace `............` contextually)
const fillParagraf = (html, ctx) => {
  if (!html) return html
  let out = html
  // "Pada hari ini ............ tanggal ............ bulan ............ tahun ............"
  out = out.replace(
    /Pada hari ini\s+(?:\.{3,}|<[^>]*>\.{3,}<[^>]*>)\s+tanggal\s+(?:\.{3,}|<[^>]*>\.{3,}<[^>]*>)\s+bulan\s+(?:\.{3,}|<[^>]*>\.{3,}<[^>]*>)\s+tahun\s+(?:\.{3,}|<[^>]*>\.{3,}<[^>]*>)/i,
    `Pada hari ini ${ctx.hari} tanggal ${ctx.tanggal_angka} bulan ${ctx.bulan} tahun ${ctx.tahun}`,
  )
  // "Mata Pelajaran ............ kelas ............"
  out = out.replace(
    /Mata Pelajaran\s+(?:\.{3,}|<[^>]*>\.{3,}<[^>]*>)\s+kelas\s+(?:\.{3,}|<[^>]*>\.{3,}<[^>]*>)/i,
    `Mata Pelajaran ${ctx.mapel} kelas ${ctx.kelas}`,
  )
  // "dari pukul ............ sampai dengan pukul ............"
  out = out.replace(
    /dari pukul\s+(?:\.{3,}|<[^>]*>\.{3,}<[^>]*>)\s+sampai dengan pukul\s+(?:\.{3,}|<[^>]*>\.{3,}<[^>]*>)/i,
    `dari pukul ${ctx.jam_mulai} sampai dengan pukul ${ctx.jam_selesai}`,
  )
  // "di ruang ............"
  out = out.replace(/di ruang\s+(?:\.{3,}|<[^>]*>\.{3,}<[^>]*>)/i, `di ruang ${ctx.ruang}`)
  return out
}

// ── Build 1 halaman BA
const buildBeritaAcaraPage = ({ template, ctx, school, daftarSiswa = [] }) => {
  const content = []

  // ── Kop sekolah
  content.push({
    columns: [
      school.logo_url
        ? { width: 60, image: school.logo_url, fit: [55, 55] }
        : { width: 60, text: '' },
      {
        width: '*',
        stack: [
          {
            text: (school.nama || 'SEKOLAH').toUpperCase(),
            fontSize: 12,
            bold: true,
            alignment: 'center',
          },
          {
            text: school.alamat_jalan || school.alamat_kabupaten || '',
            fontSize: 8,
            alignment: 'center',
            color: '#555',
          },
        ],
      },
      { width: 60, text: '' },
    ],
    margin: [0, 0, 0, 4],
  })

  // ── Judul
  content.push({
    text: template.header?.judul || 'BERITA ACARA',
    fontSize: 13,
    bold: true,
    alignment: 'center',
    margin: [0, 8, 0, 2],
  })
  if (template.header?.subjudul_1) {
    content.push({
      text: template.header.subjudul_1,
      fontSize: 11,
      bold: true,
      alignment: 'center',
    })
  }
  if (template.header?.subjudul_2) {
    content.push({
      text: template.header.subjudul_2,
      fontSize: 10,
      alignment: 'center',
      margin: [0, 0, 0, 4],
    })
  }

  // ── Garis
  content.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }],
    margin: [0, 4, 0, 10],
  })

  // ── Nomor BA (blank manual)
  content.push({
    columns: [
      { width: '*', text: '' },
      { width: 'auto', text: 'No. BA: ........../........../..........', fontSize: 9 },
    ],
    margin: [0, 0, 0, 8],
  })

  // ── Paragraf pembuka (auto-fill)
  const pembukaHtml = fillParagraf(template.paragraf_pembuka || '', ctx)
  htmlToLines(pembukaHtml).forEach((line) => content.push(line))

  // ── Statistik (blank)
  if (template.statistik?.enabled) {
    content.push({ text: '', margin: [0, 8, 0, 0] })
    const statRows = [
      ['Jumlah Peserta, seharusnya', ': ............ ( ............ ) orang'],
      ['Yang hadir', ': ............ ( ............ ) orang'],
      ['Yang tidak hadir', ': ............ ( ............ ) orang, yakni nomor'],
      ['', ': ..................................................'],
    ]
    content.push({
      table: {
        widths: [200, '*'],
        body: statRows.map((r) => [
          { text: r[0], fontSize: 10, border: [false, false, false, false] },
          { text: r[1], fontSize: 10, border: [false, false, false, false] },
        ]),
      },
      layout: 'noBorders',
      margin: [24, 0, 0, 4],
    })
  }

  // ── Paragraf sampul (blank)
  content.push({ text: '', margin: [0, 6, 0, 0] })
  const sampulHtml = template.paragraf_sampul || ''
  htmlToLines(sampulHtml).forEach((line) => content.push(line))

  // ── Paragraf kondisi
  if (template.paragraf_kondisi) {
    htmlToLines(template.paragraf_kondisi).forEach((line) =>
      content.push({ ...line, margin: [0, 6, 0, 0] }),
    )
  }

  // ── Checklist kejadian
  const checklist = (template.checklist_kejadian || []).filter((c) => c.enabled)
  if (checklist.length > 0) {
    content.push({
      text: template.label_catatan || 'Catatan selama pelaksanaan Ujian:',
      fontSize: 10,
      margin: [0, 10, 0, 4],
    })
    content.push({
      stack: checklist.map((c) => ({
        columns: [
          { width: 12, text: '☐', fontSize: 11 },
          { width: '*', text: c.label, fontSize: 10 },
        ],
        margin: [12, 1, 0, 1],
      })),
    })
    // Free text area
    content.push({
      text: '\n\n\n',
      fontSize: 10,
      margin: [12, 2, 0, 0],
    })
  }

  // ── Penutup
  content.push({
    text: 'Berita acara ini dibuat dengan sesungguhnya.',
    fontSize: 10,
    margin: [0, 10, 0, 0],
  })

  // ── TTD
  const ttdBlocks = []
  if (template.tampilkan_ttd_pengawas) {
    ttdBlocks.push({
      role: 'Pengawas 1',
      nama: ctx.pengawas_1 || '',
    })
    ttdBlocks.push({
      role: 'Pengawas 2',
      nama: ctx.pengawas_2 || '',
    })
  }
  if (template.tampilkan_ttd_kepala) {
    ttdBlocks.push({
      role: 'Kepala Sekolah,',
      nama: school.kepala_sekolah_nama || '',
      nip: school.kepala_sekolah_nip || '-',
    })
  }
  if (template.tampilkan_ttd_panitia) {
    ttdBlocks.push({
      role: 'Ketua Panitia,',
      nama: '',
      nip: '-',
    })
  }

  if (ttdBlocks.length > 0) {
    content.push({ text: '', margin: [0, 14, 0, 0] })
    content.push({
      columns: [
        { width: '*', text: '' },
        {
          width: 'auto',
          text: `${school.alamat_kabupaten || ''}, ${fmtTanggalLengkap(new Date().toISOString())}`,
          fontSize: 10,
        },
      ],
      margin: [0, 0, 0, 10],
    })

    // Bagi 2 per baris
    for (let i = 0; i < ttdBlocks.length; i += 2) {
      const left = ttdBlocks[i]
      const right = ttdBlocks[i + 1]
      const buildTtd = (b) => {
        if (!b) return { width: '*', text: '' }
        return {
          width: '*',
          stack: [
            { text: b.role, fontSize: 10, alignment: 'center' },
            { text: '', fontSize: 10, margin: [0, 0, 0, 40] },
            {
              text: b.nama || '(..........................)',
              fontSize: 10,
              alignment: 'center',
              bold: !!b.nama,
              decoration: b.nama ? 'underline' : null,
            },
            {
              text: b.nip ? `NIP. ${b.nip}` : 'NIP. ..........................',
              fontSize: 8,
              alignment: 'center',
              margin: [0, 1, 0, 0],
            },
          ],
        }
      }
      content.push({
        columns: [buildTtd(left), { width: 30, text: '' }, buildTtd(right)],
        margin: [0, 0, 0, 18],
      })
    }
  }

  // ── Halaman daftar siswa (opsional)
  if (template.tampilkan_daftar_siswa && daftarSiswa.length > 0) {
    content.push({ text: '', pageBreak: 'before' })

    content.push({
      text: 'DAFTAR HADIR PESERTA UJIAN',
      fontSize: 12,
      bold: true,
      alignment: 'center',
      margin: [0, 0, 0, 4],
    })
    content.push({
      text: `${ctx.mapel} — Kelas ${ctx.kelas} — Ruang ${ctx.ruang}`,
      fontSize: 10,
      alignment: 'center',
      margin: [0, 0, 0, 2],
    })
    content.push({
      text: `${fmtHari(ctx.tanggal)}, ${fmtTanggalLengkap(ctx.tanggal)} • ${ctx.jam_mulai}–${ctx.jam_selesai}`,
      fontSize: 9,
      alignment: 'center',
      color: '#555',
      margin: [0, 0, 0, 12],
    })

    const body = [
      [
        { text: 'No', fontSize: 9, bold: true, alignment: 'center', fillColor: '#e8e8e8' },
        { text: 'NIS', fontSize: 9, bold: true, alignment: 'center', fillColor: '#e8e8e8' },
        { text: 'Nama Peserta', fontSize: 9, bold: true, fillColor: '#e8e8e8' },
        {
          text: 'Tanda Tangan',
          fontSize: 9,
          bold: true,
          alignment: 'center',
          fillColor: '#e8e8e8',
        },
      ],
    ]
    daftarSiswa.forEach((s, idx) => {
      body.push([
        { text: String(idx + 1), fontSize: 9, alignment: 'center' },
        { text: s.nis || '-', fontSize: 9, alignment: 'center' },
        { text: s.nama || '-', fontSize: 9 },
        { text: '', fontSize: 9 },
      ])
    })

    content.push({
      table: {
        headerRows: 1,
        widths: [30, 80, '*', 130],
        body,
        dontBreakRows: true,
      },
      layout: {
        hLineWidth: () => 0.4,
        vLineWidth: () => 0.4,
        hLineColor: () => '#888',
        vLineColor: () => '#888',
        paddingLeft: () => 5,
        paddingRight: () => 5,
        paddingTop: () => 4,
        paddingBottom: () => 4,
      },
    })

    // TTD pengawas di bawah
    content.push({ text: '', margin: [0, 20, 0, 0] })
    content.push({
      columns: [
        { width: '*', text: '' },
        {
          width: 220,
          stack: [
            { text: 'Pengawas,', fontSize: 10, alignment: 'center' },
            { text: '', margin: [0, 0, 0, 40] },
            {
              text: ctx.pengawas_1 || '(..........................)',
              fontSize: 10,
              alignment: 'center',
            },
            {
              text: ctx.pengawas_2 || '',
              fontSize: 10,
              alignment: 'center',
              margin: [0, 1, 0, 0],
            },
          ],
        },
      ],
    })
  }

  return content
}

export const buildBeritaAcaraPdfDefinition = ({
  items = [], // array { detail, schedule, siswa }
  template = {},
  school = {},
  tenant = '',
}) => {
  const content = []
  items.forEach((item, idx) => {
    const { detail, schedule } = item
    const ctx = {
      hari: fmtHari(schedule.tanggal),
      tanggal: schedule.tanggal,
      tanggal_angka: fmtTanggalAngka(schedule.tanggal),
      bulan: fmtBulan(schedule.tanggal),
      tahun: fmtTahun(schedule.tanggal),
      mapel: schedule.subject_nama || '............',
      kelas: detail.class_nama || '............',
      ruang: detail.ruang_nama || '............',
      jam_mulai: schedule.jam_mulai || '............',
      jam_selesai: calcEndTime(schedule.jam_mulai, schedule.durasi_menit),
      pengawas_1: detail.pengawas_namas?.[0] || '',
      pengawas_2: detail.pengawas_namas?.[1] || '',
    }
    if (idx > 0) content.push({ text: '', pageBreak: 'before' })
    content.push(
      ...buildBeritaAcaraPage({
        template,
        ctx,
        school,
        daftarSiswa: item.siswa || [],
      }),
    )
  })

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { fontSize: 10 },
    footer: (currentPage, pageCount) => ({
      columns: [
        {
          text: tenant ? `ujian.pw — ${tenant}` : '',
          fontSize: 7,
          color: '#aaa',
          margin: [40, 0, 0, 0],
        },
        {
          text: `Hal ${currentPage}/${pageCount}`,
          fontSize: 7,
          color: '#aaa',
          alignment: 'right',
          margin: [0, 0, 40, 0],
        },
      ],
      margin: [0, 8, 0, 0],
    }),
    content,
  }
}

export const openBeritaAcaraPdf = (def) => pdfMake.createPdf(def).open()
export const downloadBeritaAcaraPdf = (def, filename = 'berita-acara.pdf') =>
  pdfMake.createPdf(def).download(filename)
