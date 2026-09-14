// src/mocks/data/billingData.js

export const mockInvoices = [
  {
    id: 'inv-1',
    invoice_no: 'INV/2026/001',
    school_name: 'SMK Negeri 1 Jakarta',
    contact_phone: '6281234567890',
    due_date: '2026-08-01',
    total_amount: 1500000,
    status: 'UNPAID',
  },
  {
    id: 'inv-2',
    invoice_no: 'INV/2026/002',
    school_name: 'SMA Swasta Cendekia Utama',
    contact_phone: '6281298765432',
    due_date: '2026-06-15',
    total_amount: 3000000,
    status: 'OVERDUE',
  },
  {
    id: 'inv-3',
    invoice_no: 'INV/2026/003',
    school_name: 'SMP Islam Terpadu Al-Hikmah',
    contact_phone: '6281355556666',
    due_date: '2026-06-30',
    total_amount: 2500000,
    status: 'PAID',
  },
  {
    id: 'inv-4',
    invoice_no: 'INV/2026/004',
    school_name: 'SD Kristen Penabur',
    contact_phone: '6281477778888',
    due_date: '2026-07-10',
    total_amount: 1000000,
    status: 'VOID',
  },
  {
    id: 'inv-5',
    invoice_no: 'INV/2026/005',
    school_name: 'SMA Negeri 5 Bandung',
    contact_phone: '6281599990000',
    due_date: '2026-05-20',
    total_amount: 4500000,
    status: 'OVERDUE',
  },
  {
    id: 'inv-6',
    invoice_no: 'INV/2026/006',
    school_name: 'SMP Negeri 10 Surabaya',
    contact_phone: '6281611112222',
    due_date: '2026-07-25',
    total_amount: 2000000,
    status: 'UNPAID',
  },
]

export const mockBillingSummary = {
  total_revenue: 2500000, // dari invoice PAID
  total_receivables: 11000000, // UNPAID + OVERDUE
  overdue_count: 2,
}

export const mockBillingSummaryExtended = {
  total_revenue: 24500000,
  total_receivables: 5250000,
  overdue_count: 2,
}

export const mockInvoicesExtended = [
  {
    id: 'inv-1',
    invoice_no: 'INV/2026/001',
    school_name: 'SMKN 1 Kawali',
    contact_phone: '081234567890',
    subdomain_url: 'smkn1kawali.ulangan.co.id',
    due_date: '2026-07-10',
    total_amount: 1500000,
    status: 'UNPAID',
  },
  {
    id: 'inv-2',
    invoice_no: 'INV/2026/002',
    school_name: 'SMA Terpadu Abdi Negara',
    contact_phone: '089876543210',
    subdomain_url: 'smaterpaduan.ulangan.co.id',
    due_date: '2026-06-15',
    total_amount: 750000,
    status: 'OVERDUE',
  },
  {
    id: 'inv-3',
    invoice_no: 'INV/2026/003',
    school_name: 'SMK Pasundan 1',
    contact_phone: '085522334455',
    subdomain_url: 'smkpasundan1.ulangan.co.id',
    due_date: '2026-07-01',
    total_amount: 3000000,
    status: 'PAID',
  },
  {
    id: 'inv-4',
    invoice_no: 'INV/2026/004',
    school_name: 'SMPN 2 Rancaekek',
    contact_phone: '081122334455',
    subdomain_url: 'smpn2rnc.ulangan.co.id',
    due_date: '2026-05-01',
    total_amount: 1200000,
    status: 'VOID',
  },
]
