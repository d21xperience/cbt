// # API tagihan, konfirmasi pembayaran, & notifikasi

import { api } from '@/boot/axios'

export const billingService = {
  getBillingSummary() {
    return api.get('/super/billing')
  },

  processInvoicePayment(invoiceId, totalAmount) {
    return api.post(`/super/billing/invoices/${invoiceId}/pay`, {
      amount_paid: totalAmount,
    })
  },

  triggerGatewayReminder(invoiceId) {
    return api.post(`/super/billing/invoices/${invoiceId}/remind`)
  },

  voidInvoice(invoiceId) {
    return api.post(`/super/billing/invoices/${invoiceId}/void`)
  },
}
