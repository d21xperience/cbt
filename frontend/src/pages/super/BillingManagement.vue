<template>
  <q-page padding class="bg-grey-1">
    <!-- Header Modul -->
    <div class="q-mb-md row justify-between items-center">
      <div>
        <h5 class="q-my-none text-weight-bold text-primary">Sistem Manajemen Penagihan SaaS</h5>
        <div class="text-caption text-grey-7">Otomatisasi invoice sewa CBT, rekonsiliasi pembayaran, dan penagihan
          piutang tenant.</div>
      </div>
      <!-- 🖨️ Tombol Cetak Laporan Rekapitulasi -->
      <div>
        <q-btn color="primary" icon="assessment" label="Cetak Laporan" no-caps padding="sm lg" @click="printReport">
          <q-tooltip>Cetak rekap tagihan berdasarkan filter aktif</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Baris Widget Ringkasan Finansial -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-4">
        <q-card flat bordered class="bg-green-1 text-green-9">
          <q-card-section class="row items-center justify-between">
            <div>
              <div class="text-caption text-weight-medium text-uppercase">Pendapatan Masuk (Lunas)</div>
              <!-- Gunakan billingStore.summary -->
              <div class="text-h5 text-weight-bolder">Rp {{ billingStore.summary.total_revenue?.toLocaleString('id-ID')
                || 0 }}</div>
            </div>
            <q-icon name="account_balance_wallet" size="md" />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-4">
        <q-card flat bordered class="bg-orange-1 text-orange-9">
          <q-card-section class="row items-center justify-between">
            <div>
              <div class="text-caption text-weight-medium text-uppercase">Total Piutang Berjalan</div>
              <div class="text-h5 text-weight-bolder">Rp {{
                billingStore.summary.total_receivables?.toLocaleString('id-ID') || 0 }}
              </div>
            </div>
            <q-icon name="pending_actions" size="md" />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-4">
        <q-card flat bordered class="bg-red-1 text-red-9">
          <q-card-section class="row items-center justify-between">
            <div>
              <div class="text-caption text-weight-medium text-uppercase">Invoice Jatuh Tempo</div>
              <div class="text-h5 text-weight-bolder">{{ billingStore.summary.overdue_count || 0 }} <span
                  class="text-subtitle2 text-weight-light">Sekolah</span></div>
            </div>
            <q-icon name="gavel" size="md" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Filter Tab Status Invoice -->
    <!-- Gunakan v-model="billingStore.currentTab" -->
    <q-tabs v-model="billingStore.currentTab" dense class="text-grey bg-white rounded-borders q-mb-md"
      active-color="primary" indicator-color="primary" align="left" flat bordered>
      <q-tab name="ALL" label="Semua Tagihan" />
      <q-tab name="UNPAID" label="Belum Bayar" />
      <q-tab name="OVERDUE" label="Jatuh Tempo" />
      <q-tab name="PAID" label="Lunas" />
      <q-tab name="VOID" label="Dibatalkan" />
    </q-tabs>

    <!-- Tabel Master Invoice -->
    <!-- Gunakan billingStore.filteredInvoices dan billingStore.loading -->
    <q-table :rows="billingStore.filteredInvoices" :columns="columns" row-key="id" flat bordered
      :loading="billingStore.loading">

      <!-- Slot Modifikasi Kolom Status Visual -->
      <template v-slot:body-cell-status="props">
        <q-td :props="props" class="text-center">
          <q-chip dense :color="getStatusColor(props.row.status)" text-color="white"
            class="text-weight-bold text-caption">
            {{ props.row.status }}
          </q-chip>
        </q-td>
      </template>

      <!-- Slot Format Nominal Rupiah -->
      <template v-slot:body-cell-total="props">
        <q-td :props="props">
          Rp {{ props.row.total_amount.toLocaleString('id-ID') }}
        </q-td>
      </template>

      <!-- Slot Tombol Aksi Dinamis dan Relevan -->
      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="q-gutter-xs text-center">
          <!-- Aksi 1: Bayar -->
          <q-btn v-if="['UNPAID', 'OVERDUE'].includes(props.row.status)" dense round color="green" icon="payments"
            @click="billingStore.payInvoice(props.row)">
            <q-tooltip>Konfirmasi Terima Pembayaran</q-tooltip>
          </q-btn>

          <!-- Aksi 2: Kirim Pengingat WhatsApp Instan -->
          <q-btn v-if="['UNPAID', 'OVERDUE'].includes(props.row.status)" dense round color="teal" icon="send"
            @click="billingStore.sendReminder(props.row)">
            <q-tooltip>Kirim Invoice Ke WA Sekolah</q-tooltip>
          </q-btn>

          <!-- Aksi 3: Cetak Struk (Fungsi tetap di komponen) -->
          <q-btn v-if="props.row.status !== 'VOID'" dense round color="grey-9" icon="print"
            @click="printReceipt(props.row)">
            <q-tooltip>Cetak Struk Transaksi</q-tooltip>
          </q-btn>

          <!-- Aksi 4: Pembatalan Tagihan (Void) -->
          <q-btn v-if="['UNPAID', 'OVERDUE'].includes(props.row.status)" dense round color="red" icon="block"
            @click="billingStore.voidInvoice(props.row)">
            <q-tooltip>Batalkan/Void Invoice</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue'
import { useBillingStore } from '@/stores/super/superBilling' // Sesuaikan path import store
import { usePrintReport } from '@/composables/super/usePrintReport'
const billingStore = useBillingStore()

// ===== INISIALISASI COMPOSABLE =====
// Kita "suntikkan" data dari store ke composable
const { printReport } = usePrintReport({
  data: billingStore.filteredInvoices,
  summary: billingStore.summary,
  currentTab: billingStore.currentTab
})
// Inisialisasi Store

// State & Constants yang tetap di komponen (karena murni untuk tampilan/UI)
const columns = [
  { name: 'id', label: 'No. Invoice', field: 'invoice_no', align: 'left', sortable: true },
  { name: 'school', label: 'Tenant Sekolah', field: 'school_name', align: 'left', sortable: true },
  { name: 'due', label: 'Jatuh Tempo', field: 'due_date', align: 'left' },
  { name: 'total', label: 'Total Tagihan', align: 'right' },
  { name: 'status', label: 'Status', align: 'center' },
  { name: 'actions', label: 'Aksi Keuangan', align: 'center' }
]

// Helper UI untuk warna chip status
const getStatusColor = (status) => {
  switch (status) {
    case 'PAID': return 'positive'
    case 'UNPAID': return 'warning'
    case 'OVERDUE': return 'red-7'
    case 'VOID': return 'grey-6'
    default: return 'primary'
  }
}

// Logic Cetak Struk (Tetap di komponen karena manipulasi DOM/Window)
const printReceipt = (invoice) => {
  const printWindow = window.open('', '_blank')
  printWindow.document.write(`
    <html>
      <head>
        <title>KUITANSI RESMI CBT ENGINE - ${invoice.invoice_no}</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 30px; color: #333; line-height: 1.6; }
          .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 10px; margin-bottom: 20px; }
          .invoice-title { font-size: 22px; font-weight: bold; letter-spacing: 1px; }
          .meta-table, .detail-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .detail-table th, .detail-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .detail-table th { background-color: #f5f5f5; }
          .total-box { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; padding: 10px; background: #e8f5e9; border-radius: 4px; }
          .footer-note { text-align: center; margin-top: 40px; font-size: 12px; color: #777; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="invoice-title">ULANGAN.CO.ID - NOTA TAGIHAN</div>
          <p>Layanan Infrastruktur Cloud & Manajemen Engine CBT Terpusat</p>
          <p>TOTAL PEMBAYARAN: Rp ${invoice.total_amount.toLocaleString('id-ID')}</p>
          <p>Dokumen ini diterbitkan sah secara digital oleh sistem Superadmin pusat.</p>
          <p>Pembayaran diproses menggunakan metode rekonsiliasi manual atau transfer bank berizin.</p>
          <p>Terima kasih atas kerja samanya.</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        </` + `script>
      </body>
    </html>
  `)
  printWindow.document.close()
}




// Fetch data saat komponen di-mount
onMounted(() => {
  billingStore.loadBillingData()
})
</script>
