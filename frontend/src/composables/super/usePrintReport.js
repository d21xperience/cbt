// src/composables/usePrintReport.js
import { useQuasar } from 'quasar'

/**
 * Composable untuk mencetak laporan rekapitulasi.
 * Dirancang agar reusable di berbagai modul (billing, laporan, dll).
 *
 * @param {Object} options - Konfigurasi opsional
 * @param {Array} options.data - Array data yang akan dicetak (default: dari store)
 * @param {Object} options.summary - Objek ringkasan finansial
 * @param {String} options.currentTab - Filter tab yang sedang aktif
 * @param {Object} options.tabLabels - Mapping label untuk tab
 * @param {String} options.reportTitle - Judul laporan (default: 'LAPORAN REKAPITULASI TAGIHAN SEWA CBT')
 * @param {String} options.companyName - Nama perusahaan (default: 'ULANGAN.CO.ID')
 */
export function usePrintReport(options = {}) {
  const $q = useQuasar()

  // ===== HELPER FUNCTIONS =====
  const formatTanggalID = (dateStr) => {
    if (!dateStr) return '-'
    const bulan = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ]
    const d = new Date(dateStr)
    return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`
  }

  const formatRupiah = (amount) => {
    return `Rp ${(amount || 0).toLocaleString('id-ID')}`
  }

  // Default tab labels (bisa di-override lewat options)
  const defaultTabLabels = {
    ALL: 'Semua Tagihan',
    UNPAID: 'Belum Bayar',
    OVERDUE: 'Jatuh Tempo',
    PAID: 'Lunas',
    VOID: 'Dibatalkan',
  }

  // ===== FUNGSI UTAMA: CETAK LAPORAN =====
  const printReport = () => {
    const {
      data = [],
      summary = {},
      currentTab = 'ALL',
      tabLabels = defaultTabLabels,
      reportTitle = 'LAPORAN REKAPITULASI TAGIHAN SEWA CBT',
      companyName = 'ULANGAN.CO.ID',
    } = options

    // Validasi data kosong
    if (!data || data.length === 0) {
      $q.notify({
        type: 'warning',
        message: 'Tidak ada data tagihan yang dapat dicetak pada filter ini.',
      })
      return
    }

    const now = new Date()
    const tanggalCetak = formatTanggalID(now.toISOString())
    const waktuCetak = now.toLocaleTimeString('id-ID')
    const filterAktif = tabLabels[currentTab] || 'Semua Tagihan'

    // Generate baris tabel
    const rowsHtml = data
      .map(
        (inv, index) => `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td><strong>${inv.invoice_no}</strong></td>
        <td>${inv.school_name}</td>
        <td class="text-center">${formatTanggalID(inv.due_date)}</td>
        <td class="text-right">${formatRupiah(inv.total_amount)}</td>
        <td class="text-center">
          <span class="status-badge status-${inv.status.toLowerCase()}">${inv.status}</span>
        </td>
      </tr>
    `,
      )
      .join('')

    const totalFiltered = data.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

    const htmlContent = generateHtmlContent({
      companyName,
      reportTitle,
      tanggalCetak,
      waktuCetak,
      filterAktif,
      totalData: data.length,
      summary,
      rowsHtml,
      totalFiltered,
      formatRupiah,
    })

    // Buka window cetak
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      $q.notify({
        type: 'negative',
        message: 'Popup diblokir. Izinkan popup untuk mencetak laporan.',
      })
      return
    }

    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  return {
    printReport,
    formatTanggalID,
    formatRupiah,
  }
}

// ===== FUNGSI PRIVATE: Generate HTML Template =====
function generateHtmlContent({
  companyName,
  reportTitle,
  tanggalCetak,
  waktuCetak,
  filterAktif,
  totalData,
  summary,
  rowsHtml,
  totalFiltered,
  formatRupiah,
}) {
  return (
    `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Laporan Tagihan - ${tanggalCetak}</title>
      <style>
        @page { size: A4 landscape; margin: 15mm; }
        * { box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          color: #222; margin: 0; padding: 0;
          font-size: 12px; line-height: 1.5;
        }
        .doc-header {
          border-bottom: 3px double #333;
          padding-bottom: 12px; margin-bottom: 20px;
          text-align: center;
        }
        .doc-header h1 {
          margin: 0; font-size: 20px;
          letter-spacing: 2px; color: #1a237e;
        }
        .doc-header h2 {
          margin: 4px 0 0 0; font-size: 14px;
          font-weight: normal; color: #555;
        }
        .doc-meta {
          margin-top: 10px; font-size: 11px; color: #666;
          display: flex; justify-content: space-between;
        }
        .filter-info {
          background: #f5f5f5; padding: 8px 14px;
          border-left: 4px solid #1a237e;
          margin-bottom: 16px; font-size: 12px;
        }
        .filter-info strong { color: #1a237e; }
        .summary-row {
          display: flex; gap: 12px; margin-bottom: 20px;
        }
        .summary-box {
          flex: 1; padding: 12px 16px;
          border: 1px solid #ddd; border-radius: 4px;
          background: #fafafa;
        }
        .summary-box .label {
          font-size: 10px; text-transform: uppercase;
          color: #777; font-weight: 600; letter-spacing: 0.5px;
        }
        .summary-box .value {
          font-size: 18px; font-weight: bold; margin-top: 4px;
        }
        .summary-box.green { border-left: 4px solid #2e7d32; }
        .summary-box.green .value { color: #2e7d32; }
        .summary-box.orange { border-left: 4px solid #ef6c00; }
        .summary-box.orange .value { color: #ef6c00; }
        .summary-box.red { border-left: 4px solid #c62828; }
        .summary-box.red .value { color: #c62828; }
        table {
          width: 100%; border-collapse: collapse;
          margin-bottom: 20px; font-size: 11px;
        }
        table th {
          background: #1a237e; color: white;
          padding: 10px 8px; text-align: left;
          font-weight: 600; border: 1px solid #1a237e;
        }
        table td {
          padding: 8px; border: 1px solid #ddd;
          vertical-align: middle;
        }
        table tbody tr:nth-child(even) { background: #f9f9f9; }
        table tfoot td {
          background: #e8eaf6; font-weight: bold;
          font-size: 12px; border: 1px solid #1a237e;
        }
        .status-badge {
          display: inline-block; padding: 3px 10px;
          border-radius: 12px; font-size: 10px;
          font-weight: bold; color: white;
          text-transform: uppercase;
        }
        .status-paid { background: #2e7d32; }
        .status-unpaid { background: #ef6c00; }
        .status-overdue { background: #c62828; }
        .status-void { background: #757575; }
        .signature-section {
          margin-top: 40px; display: flex;
          justify-content: flex-end;
        }
        .signature-box { text-align: center; width: 250px; }
        .signature-box .title {
          margin-bottom: 60px; font-size: 11px;
        }
        .signature-box .line {
          border-top: 1px solid #333;
          padding-top: 4px; font-weight: bold;
        }
        .doc-footer {
          margin-top: 30px; padding-top: 10px;
          border-top: 1px solid #ccc;
          font-size: 10px; color: #777;
          text-align: center; font-style: italic;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="doc-header">
        <h1>${companyName}</h1>
        <h2>${reportTitle}</h2>
        <div class="doc-meta">
          <span>Dicetak pada: ${tanggalCetak} • ${waktuCetak} WIB</span>
          <span>Dokumen Sistem Superadmin</span>
        </div>
      </div>

      <div class="filter-info">
        Filter Aktif: <strong>${filterAktif}</strong>
        &nbsp;•&nbsp;
        Jumlah Data: <strong>${totalData} Invoice</strong>
      </div>

      <div class="summary-row">
        <div class="summary-box green">
          <div class="label">Total Pendapatan (Lunas)</div>
          <div class="value">${formatRupiah(summary.total_revenue)}</div>
        </div>
        <div class="summary-box orange">
          <div class="label">Total Piutang Berjalan</div>
          <div class="value">${formatRupiah(summary.total_receivables)}</div>
        </div>
        <div class="summary-box red">
          <div class="label">Invoice Jatuh Tempo</div>
          <div class="value">${summary.overdue_count || 0} Sekolah</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 40px;">No</th>
            <th style="width: 140px;">No. Invoice</th>
            <th>Tenant Sekolah</th>
            <th style="width: 140px;" class="text-center">Jatuh Tempo</th>
            <th style="width: 150px;" class="text-right">Total Tagihan</th>
            <th style="width: 110px;" class="text-center">Status</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr>
            <td colspan="4" class="text-right">TOTAL ${filterAktif.toUpperCase()}:</td>
            <td class="text-right">${formatRupiah(totalFiltered)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <div class="signature-section">
        <div class="signature-box">
          <div class="title">
            Jakarta, ${tanggalCetak}<br>
            <strong>Finance & Billing Manager</strong>
          </div>
          <div class="line">
            (Superadmin Pusat)<br>
            <span style="font-weight: normal; font-size: 10px;">Sistem Terverifikasi Digital</span>
          </div>
        </div>
      </div>

      <div class="doc-footer">
        Dokumen ini diterbitkan secara otomatis oleh Sistem Manajemen Penagihan SaaS ${companyName}.
        <br>
        Rekonsiliasi pembayaran dilakukan melalui transfer bank berizin. Hubungi support@ulangan.co.id untuk konfirmasi.
      </div>

      <>
        window.onload = function() { window.print(); }
      </` +
    `script>
    </body>
    </html>
  `
  )
}
