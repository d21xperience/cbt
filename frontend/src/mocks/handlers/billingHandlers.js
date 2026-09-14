// src/mocks/handlers/billingHandlers.js
import {
  mockInvoices,
  mockBillingSummary,
  mockInvoicesExtended,
  mockBillingSummaryExtended,
} from '../data/billingData'

const DELAY = 300

export const billingHandlers = (mock) => {
  // GET: Daftar invoice + summary (versi pertama)
  mock.onGet('/super/billing').reply(() => {
    return [200, { data: mockInvoices, summary: mockBillingSummary }, { delay: DELAY }]
  })

  // GET: Daftar invoice + summary (versi extended)
  mock.onGet('/super/billing/invoices').reply(() => {
    return [
      200,
      { data: mockInvoicesExtended, summary: mockBillingSummaryExtended },
      { delay: DELAY },
    ]
  })

  // POST: Konfirmasi pembayaran (dinamis ID)
  mock.onPost(/\/super\/billing\/invoices\/.*\/pay/).reply(() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          200,
          { status: 'success', message: 'Pembayaran berhasil diproses dan direkonsiliasi.' },
        ])
      }, 800)
    })
  })

  // POST: Kirim pengingat WhatsApp (dinamis ID)
  mock.onPost(/\/super\/billing\/invoices\/.*\/remind/).reply(() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          200,
          { status: 'success', message: 'Notifikasi WhatsApp berhasil ditembakkan ke gateway.' },
        ])
      }, 600)
    })
  })

  // POST: Batalkan invoice (Void) (dinamis ID)
  mock.onPost(/\/super\/billing\/invoices\/.*\/void/).reply(() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([200, { status: 'success', message: 'Invoice berhasil dibatalkan (Void).' }])
      }, 700)
    })
  })
}
