// src/mocks/handlers/billingHandlers.js
import { mockInvoices, mockBillingSummary } from '../data/billingData'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

let invoices = cloneMock(mockInvoices)
let summary = { ...mockBillingSummary }

export const resetBillingMockData = () => {
  invoices = cloneMock(mockInvoices)
  summary = { ...mockBillingSummary }
}

const recomputeSummary = () => {
  const paid = invoices.filter((i) => i.status === 'PAID')
  const receivables = invoices.filter((i) => ['UNPAID', 'OVERDUE'].includes(i.status))
  const overdue = invoices.filter((i) => i.status === 'OVERDUE')

  summary = {
    total_revenue: paid.reduce((s, i) => s + i.total_amount, 0),
    total_receivables: receivables.reduce((s, i) => s + i.total_amount, 0),
    overdue_count: overdue.length,
  }
}

export const billingHandlers = (mock) => {
  // GET /super/billing
  mock.onGet('/super/billing').reply(() => {
    return [
      200,
      {
        status: 'ok',
        data: cloneMock(invoices),
        summary: { ...summary },
      },
      { delay: DELAY },
    ]
  })

  // POST /super/billing/invoices/:id/pay
  mock.onPost(/\/super\/billing\/invoices\/([^/]+)\/pay/).reply((config) => {
    const id = config.url.match(/\/super\/billing\/invoices\/([^/]+)\/pay/)[1]
    console.info('[MOCK] POST /super/billing/invoices/:id/pay →', id)

    const inv = invoices.find((i) => i.id === id)
    if (!inv) return [404, { error: 'invoice_not_found' }, { delay: DELAY }]

    inv.status = 'PAID'
    recomputeSummary()
    return [200, { status: 'ok', message: 'Invoice lunas' }, { delay: DELAY }]
  })

  // POST /super/billing/invoices/:id/remind
  mock.onPost(/\/super\/billing\/invoices\/([^/]+)\/remind/).reply((config) => {
    const id = config.url.match(/\/super\/billing\/invoices\/([^/]+)\/remind/)[1]
    console.info('[MOCK] POST /super/billing/invoices/:id/remind →', id)

    const inv = invoices.find((i) => i.id === id)
    if (!inv) return [404, { error: 'invoice_not_found' }, { delay: DELAY }]

    return [200, { status: 'ok', message: 'Reminder terkirim' }, { delay: DELAY }]
  })

  // POST /super/billing/invoices/:id/void
  mock.onPost(/\/super\/billing\/invoices\/([^/]+)\/void/).reply((config) => {
    const id = config.url.match(/\/super\/billing\/invoices\/([^/]+)\/void/)[1]
    console.info('[MOCK] POST /super/billing/invoices/:id/void →', id)

    const inv = invoices.find((i) => i.id === id)
    if (!inv) return [404, { error: 'invoice_not_found' }, { delay: DELAY }]

    inv.status = 'VOID'
    recomputeSummary()
    return [200, { status: 'ok', message: 'Invoice void' }, { delay: DELAY }]
  })
}
