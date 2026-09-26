<template>
  <q-page padding class="bg-grey-1">
    <!-- Header -->
    <div class="q-mb-md row justify-between items-center">
      <div>
        <h5 class="q-my-none text-weight-bold text-primary">Sistem Manajemen Penagihan SaaS</h5>
        <div class="text-caption text-grey-7">
          Otomatisasi invoice sewa CBT, rekonsiliasi pembayaran, dan penagihan piutang tenant.
        </div>
      </div>
      <q-btn color="primary" icon="assessment" label="Cetak Laporan" no-caps padding="sm lg" @click="printReport">
        <q-tooltip>Cetak rekap tagihan berdasarkan filter aktif</q-tooltip>
      </q-btn>
    </div>

    <!-- Summary Cards -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-4">
        <q-card flat bordered class="bg-green-1 text-green-9">
          <q-card-section class="row items-center justify-between">
            <div>
              <div class="text-caption text-weight-medium text-uppercase">Pendapatan Masuk (Lunas)</div>
              <div class="text-h5 text-weight-bolder">
                Rp {{ (billingStore.summary.total_revenue || 0).toLocaleString('id-ID') }}
              </div>
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
              <div class="text-h5 text-weight-bolder">
                Rp {{ (billingStore.summary.total_receivables || 0).toLocaleString('id-ID') }}
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
              <div class="text-h5 text-weight-bolder">
                {{ billingStore.summary.overdue_count || 0 }}
                <span class="text-subtitle2 text-weight-light">Sekolah</span>
              </div>
            </div>
            <q-icon name="gavel" size="md" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Billing Type Filter -->
    <q-card flat bordered class="q-mb-md bg-white">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-6">
          <q-btn-toggle v-model="billingStore.billingTypeFilter" :options="billingTypeOptions" no-caps unelevated
            toggle-color="primary" color="grey-3" text-color="grey-8" class="full-width" />
        </div>
        <div class="col-12 col-sm-6 text-caption text-grey-7 text-right">
          Menampilkan <b>{{ billingStore.filteredInvoices.length }}</b> invoice
        </div>
      </q-card-section>
    </q-card>

    <!-- Status Tabs -->
    <q-tabs v-model="billingStore.currentTab" dense class="text-grey bg-white rounded-borders q-mb-md"
      active-color="primary" indicator-color="primary" align="left" flat bordered>
      <q-tab name="ALL" label="Semua Tagihan" />
      <q-tab name="UNPAID" label="Belum Bayar" />
      <q-tab name="OVERDUE" label="Jatuh Tempo" />
      <q-tab name="PAID" label="Lunas" />
      <q-tab name="VOID" label="Dibatalkan" />
    </q-tabs>

    <!-- Table -->
    <q-table :rows="billingStore.filteredInvoices" :columns="columns" row-key="id" flat bordered
      :loading="billingStore.loading" no-data-label="Tidak ada tagihan untuk filter ini">
      <!-- Billing Type -->
      <template v-slot:body-cell-billing_type="props">
        <q-td :props="props" class="text-center">
          <q-chip dense :color="props.row.billing_type === 'MONTHLY' ? 'indigo-6' : 'teal-6'" text-color="white"
            :icon="props.row.billing_type === 'MONTHLY' ? 'event_repeat' : 'quiz'"
            :label="props.row.billing_type === 'MONTHLY' ? 'Bulanan' : 'Per Ujian'" />
        </q-td>
      </template>

      <!-- Status -->
      <template v-slot:body-cell-status="props">
        <q-td :props="props" class="text-center">
          <q-chip dense :color="getStatusColor(props.row.status)" text-color="white"
            class="text-weight-bold text-caption">
            {{ props.row.status }}
          </q-chip>
        </q-td>
      </template>

      <!-- Total Rupiah -->
      <template v-slot:body-cell-total="props">
        <q-td :props="props" class="text-right">
          Rp {{ (props.row.total_amount || 0).toLocaleString('id-ID') }}
        </q-td>
      </template>

      <!-- Actions -->
      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="q-gutter-xs text-center">
          <q-btn v-if="['UNPAID', 'OVERDUE'].includes(props.row.status)" dense round color="green" icon="payments"
            @click="billingStore.payInvoice(props.row)">
            <q-tooltip>Konfirmasi Terima Pembayaran</q-tooltip>
          </q-btn>

          <q-btn v-if="['UNPAID', 'OVERDUE'].includes(props.row.status)" dense round color="teal" icon="send"
            @click="billingStore.sendReminder(props.row)">
            <q-tooltip>Kirim Invoice Ke WA Sekolah</q-tooltip>
          </q-btn>

          <q-btn v-if="props.row.status !== 'VOID'" dense round color="grey-9" icon="print"
            @click="printReceipt(props.row)">
            <q-tooltip>Cetak Struk Transaksi</q-tooltip>
          </q-btn>

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
import { useBillingStore } from '@/stores/super/superBilling'
import { usePrintReport } from '@/composables/super/usePrintReport'
import { usePrintReceipt } from '@/composables/super/usePrintReceipt'

const billingStore = useBillingStore()

// ── Print laporan rekapitulasi (reactive — pakai getter functions)
const { printReport } = usePrintReport({
  getData: () => billingStore.filteredInvoices,
  getSummary: () => billingStore.summary,
  getCurrentTab: () => billingStore.currentTab,
  getBillingTypeFilter: () => billingStore.billingTypeFilter,
})

// ── Print struk per-invoice
const { printReceipt } = usePrintReceipt()

// ── UI-only
const billingTypeOptions = [
  { label: 'Semua Tipe', value: 'ALL' },
  { label: 'Bulanan', value: 'MONTHLY' },
  { label: 'Per Ujian', value: 'PER_EXAM' },
]

const columns = [
  { name: 'id', label: 'No. Invoice', field: 'invoice_no', align: 'left', sortable: true, style: 'min-width: 140px' },
  { name: 'school', label: 'Tenant Sekolah', field: 'school_name', align: 'left', sortable: true, style: 'min-width: 180px' },
  { name: 'billing_type', label: 'Tipe', align: 'center', style: 'width: 120px' },
  { name: 'due', label: 'Jatuh Tempo', field: 'due_date', align: 'left', style: 'width: 130px' },
  { name: 'total', label: 'Total Tagihan', align: 'right', style: 'width: 150px' },
  { name: 'status', label: 'Status', align: 'center', style: 'width: 110px' },
  { name: 'actions', label: 'Aksi Keuangan', align: 'center', style: 'width: 200px' },
]

const getStatusColor = (status) => {
  switch (status) {
    case 'PAID': return 'positive'
    case 'UNPAID': return 'warning'
    case 'OVERDUE': return 'red-7'
    case 'VOID': return 'grey-6'
    default: return 'primary'
  }
}

onMounted(() => {
  billingStore.loadBillingData()
})
</script>
