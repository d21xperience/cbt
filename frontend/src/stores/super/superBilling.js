// src/stores/super/superBilling.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Notify, Dialog } from 'quasar'
import { billingService } from '@/services/super/BillingService'

export const useBillingStore = defineStore('billing', () => {
  // ── State
  const invoices = ref([])
  const summary = ref({})
  const currentTab = ref('ALL') // status filter
  const billingTypeFilter = ref('ALL') // ALL | MONTHLY | PER_EXAM
  const loading = ref(false)

  // ── Getters
  const filteredInvoices = computed(() => {
    let list = Array.isArray(invoices.value) ? invoices.value : []

    if (currentTab.value !== 'ALL') {
      list = list.filter((inv) => inv.status === currentTab.value)
    }
    if (billingTypeFilter.value !== 'ALL') {
      list = list.filter((inv) => inv.billing_type === billingTypeFilter.value)
    }
    return list
  })

  // ── Actions
  const loadBillingData = async () => {
    loading.value = true
    try {
      const res = await billingService.getBillingSummary()
      const payload = res?.data || {}
      invoices.value = Array.isArray(payload.data) ? payload.data : []
      summary.value = payload.summary || {}
    } catch (err) {
      console.error('[BillingStore] load failed:', err)
      Notify.create({ type: 'negative', message: 'Gagal sinkronisasi data finansial.' })
    } finally {
      loading.value = false
    }
  }

  const payInvoice = (invoice) => {
    Dialog.create({
      title: 'Konfirmasi Pelunasan Sewa',
      message: `Apakah Anda menyatakan bahwa <b>${invoice.school_name}</b> telah membayar lunas sebesar Rp ${(invoice.total_amount || 0).toLocaleString('id-ID')}?`,
      html: true,
      cancel: true,
      persistent: true,
    }).onOk(async () => {
      try {
        await billingService.processInvoicePayment(invoice.id, invoice.total_amount)
        Notify.create({
          type: 'positive',
          message: `Invoice ${invoice.invoice_no} sukses diperbarui menjadi LUNAS.`,
        })
        await loadBillingData()
      } catch (err) {
        console.error('[BillingStore] pay failed:', err)
        Notify.create({ type: 'negative', message: 'Gagal memproses pembayaran.' })
      }
    })
  }

  const sendReminder = async (invoice) => {
    try {
      await billingService.triggerGatewayReminder(invoice.id)
      Notify.create({
        type: 'positive',
        icon: 'chat',
        message: `Pesan tagihan berhasil dikirim ke nomor sekolah: ${invoice.contact_phone || '-'}`,
      })
    } catch (err) {
      console.error('[BillingStore] reminder failed:', err)
      Notify.create({ type: 'negative', message: 'Gagal memicu pengiriman notifikasi.' })
    }
  }

  const voidInvoice = (invoice) => {
    Dialog.create({
      title: 'Batalkan Tagihan (Void)',
      message: `Apakah Anda yakin ingin membatalkan tagihan <b>${invoice.invoice_no}</b>? Tindakan ini tidak dapat dibatalkan.`,
      html: true,
      ok: { color: 'red-9', label: 'Ya, Void' },
      cancel: true,
    }).onOk(async () => {
      try {
        await billingService.voidInvoice(invoice.id)
        Notify.create({
          type: 'info',
          message: 'Invoice berhasil diubah statusnya menjadi VOID.',
        })
        await loadBillingData()
      } catch (err) {
        console.error('[BillingStore] void failed:', err)
        Notify.create({ type: 'negative', message: 'Gagal membatalkan invoice.' })
      }
    })
  }

  return {
    // state
    invoices,
    summary,
    currentTab,
    billingTypeFilter,
    loading,
    // getters
    filteredInvoices,
    // actions
    loadBillingData,
    payInvoice,
    sendReminder,
    voidInvoice,
  }
})
