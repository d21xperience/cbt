// src/composables/super/usePrintReceipt.js
//
// Composable: cetak struk/kuitansi per-invoice (infrastructure concern).
// Diekstrak dari BillingManagement.vue — manipulasi DOM/window.

export function usePrintReceipt() {
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
    if (!Number.isFinite(d.getTime())) return dateStr
    return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`
  }

  const formatRupiah = (n) => `Rp ${(Number(n) || 0).toLocaleString('id-ID')}`

  const billingTypeLabel = (t) => {
    if (t === 'MONTHLY') return 'Tagihan Bulanan'
    if (t === 'PER_EXAM') return 'Tagihan Per Ujian'
    return 'Tagihan'
  }

  /**
   * Cetak struk/kuitansi resmi per invoice.
   * @param {object} invoice
   */
  const printReceipt = (invoice) => {
    if (!invoice) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>KUITANSI - ${invoice.invoice_no}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0; color: #333; line-height: 1.6; }
    .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 12px; margin-bottom: 24px; }
    .invoice-title { font-size: 22px; font-weight: bold; letter-spacing: 2px; color: #1a237e; }
    .sub { font-size: 12px; color: #666; margin-top: 4px; }
    .meta { margin: 20px 0; }
    .meta-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #ccc; }
    .meta-row .label { color: #777; font-size: 12px; }
    .meta-row .value { font-weight: 600; }
    .total-box { text-align: right; font-size: 20px; font-weight: bold; margin-top: 24px; padding: 16px; background: #e8f5e9; border-radius: 4px; color: #2e7d32; }
    .footer-note { text-align: center; margin-top: 40px; font-size: 11px; color: #777; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <div class="invoice-title">UJIAN.PW</div>
    <div class="sub">KUITANSI RESMI — Layanan CBT Engine Terpusat</div>
    <div class="sub">Dokumen diterbitkan sah secara digital oleh sistem superadmin pusat</div>
  </div>

  <div class="meta">
    <div class="meta-row">
      <span class="label">No. Invoice</span>
      <span class="value">${invoice.invoice_no || '-'}</span>
    </div>
    <div class="meta-row">
      <span class="label">Sekolah</span>
      <span class="value">${invoice.school_name || '-'}</span>
    </div>
    <div class="meta-row">
      <span class="label">Tipe Tagihan</span>
      <span class="value">${billingTypeLabel(invoice.billing_type)}</span>
    </div>
    <div class="meta-row">
      <span class="label">Jatuh Tempo</span>
      <span class="value">${formatTanggalID(invoice.due_date)}</span>
    </div>
    <div class="meta-row">
      <span class="label">Status</span>
      <span class="value">${invoice.status || '-'}</span>
    </div>
  </div>

  <div class="total-box">
    TOTAL: ${formatRupiah(invoice.total_amount)}
  </div>

  <div class="footer-note">
    Pembayaran diproses menggunakan metode rekonsiliasi manual atau transfer bank berizin.<br>
    Terima kasih atas kerja sama Anda.
  </div>

  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`

    printWindow.document.write(html)
    printWindow.document.close()
  }

  return { printReceipt, formatTanggalID, formatRupiah, billingTypeLabel }
}
