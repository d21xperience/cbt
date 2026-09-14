// src/stores/billing.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/boot/axios'
import { Notify, Dialog } from 'quasar'

export const useBillingStore = defineStore('billing', () => {
  // 1. State
  const invoices = ref([])
  const summary = ref({})
  const currentTab = ref('ALL')
  const loading = ref(false)

  // 2. Getters
  const filteredInvoices = computed(() => {
    if (currentTab.value === 'ALL') return invoices.value
    return invoices.value.filter((inv) => inv.status === currentTab.value)
  })

  // 3. Actions
  const loadBillingData = async () => {
    loading.value = true
    try {
      const response = await api.get('/super/billing')
      invoices.value = response.data.data
      summary.value = response.data.summary
    } catch {
      Notify.create({ type: 'negative', message: 'Gagal sinkronisasi data finansial.' })
    } finally {
      loading.value = false
    }
  }

  const payInvoice = (invoice) => {
    Dialog.create({
      title: 'Konfirmasi Pelunasan Sewa',
      message: `Apakah Anda menyatakan bahwa ${invoice.school_name} telah membayar lunas sebesar Rp ${invoice.total_amount.toLocaleString('id-ID')}?`,
      cancel: true,
      persistent: true,
    }).onOk(async () => {
      try {
        await api.post(`/super/billing/invoices/${invoice.id}/pay`, {
          amount_paid: invoice.total_amount,
        })
        Notify.create({
          type: 'positive',
          message: `Invoice ${invoice.invoice_no} sukses diperbarui menjadi LUNAS.`,
        })
        loadBillingData() // Reload data setelah sukses
      } catch {
        Notify.create({ type: 'negative', message: 'Gagal memproses pembayaran.' })
      }
    })
  }

  const sendReminder = async (invoice) => {
    try {
      await api.post(`/super/billing/invoices/${invoice.id}/remind`)
      Notify.create({
        type: 'positive',
        icon: 'chat',
        message: `Pesan tagihan berhasil ditembakkan via gateway ke nomor sekolah: ${invoice.contact_phone}`,
      })
    } catch {
      Notify.create({ type: 'negative', message: 'Gagal memicu pengiriman notifikasi.' })
    }
  }

  const voidInvoice = (invoice) => {
    Dialog.create({
      title: 'Batalkan Tagihan (Void)',
      message: `Apakah Anda yakin ingin membatalkan/menghapus tagihan ${invoice.invoice_no}? Tindakan ini tidak dapat dibatalkan.`,
      ok: { color: 'red-9', label: 'Ya, Void' },
      cancel: true,
    }).onOk(async () => {
      try {
        await api.post(`/super/billing/invoices/${invoice.id}/void`)
        Notify.create({ type: 'info', message: 'Invoice berhasil diubah statusnya menjadi VOID.' })
        loadBillingData()
      } catch {
        Notify.create({ type: 'negative', message: 'Gagal membatalkan invoice.' })
      }
    })
  }

  // Return semua state, getters, dan actions yang dibutuhkan di komponen
  return {
    invoices,
    summary,
    currentTab,
    loading,
    filteredInvoices,
    loadBillingData,
    payInvoice,
    sendReminder,
    voidInvoice,
  }
})
