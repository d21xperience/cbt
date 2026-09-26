// src/mocks/data/billingData.js
// Mock invoices + summary — Batch 5.
// billing_type: MONTHLY | PER_EXAM

export const mockInvoices = [
  // ── MONTHLY (bulanan)
  {
    id: 'inv-m-001',
    invoice_no: 'INV-2026-09-M001',
    school_name: 'SMK Pasundan Jatinangor',
    due_date: '2026-09-30',
    total_amount: 500000,
    status: 'UNPAID',
    billing_type: 'MONTHLY',
    contact_phone: '081234567890',
  },
  {
    id: 'inv-m-002',
    invoice_no: 'INV-2026-09-M002',
    school_name: 'SMKN Kawali',
    due_date: '2026-09-15',
    total_amount: 500000,
    status: 'OVERDUE',
    billing_type: 'MONTHLY',
    contact_phone: '082345678901',
  },
  {
    id: 'inv-m-003',
    invoice_no: 'INV-2026-08-M003',
    school_name: 'MTs. Maarif Jatinangor',
    due_date: '2026-08-31',
    total_amount: 400000,
    status: 'PAID',
    billing_type: 'MONTHLY',
    contact_phone: '083456789012',
  },
  // ── PER_EXAM (per ujian)
  {
    id: 'inv-e-001',
    invoice_no: 'INV-2026-09-E001',
    school_name: 'SMK Pasundan Jatinangor',
    due_date: '2026-10-10',
    total_amount: 750000,
    status: 'UNPAID',
    billing_type: 'PER_EXAM',
    contact_phone: '081234567890',
  },
  {
    id: 'inv-e-002',
    invoice_no: 'INV-2026-09-E002',
    school_name: 'SMKN Kawali',
    due_date: '2026-10-10',
    total_amount: 600000,
    status: 'UNPAID',
    billing_type: 'PER_EXAM',
    contact_phone: '082345678901',
  },
  {
    id: 'inv-e-003',
    invoice_no: 'INV-2026-08-E003',
    school_name: 'MTs. Maarif Jatinangor',
    due_date: '2026-08-25',
    total_amount: 350000,
    status: 'PAID',
    billing_type: 'PER_EXAM',
    contact_phone: '083456789012',
  },
  // ── VOID (arsip)
  {
    id: 'inv-m-004',
    invoice_no: 'INV-2026-07-M004',
    school_name: 'SMK Pasundan Jatinangor',
    due_date: '2026-07-31',
    total_amount: 500000,
    status: 'VOID',
    billing_type: 'MONTHLY',
    contact_phone: '081234567890',
  },
]

export const mockBillingSummary = {
  total_revenue: 1250000, // M003 + E003
  total_receivables: 2350000, // semua UNPAID + OVERDUE
  overdue_count: 1, // M002
}
