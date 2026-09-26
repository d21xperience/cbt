// src/mocks/data/superadminData.js
//
// Format tenant_id: UUID v4 (deterministic untuk mock, static).
// Referensi backend: INSERT INTO tenants (tenant_id, ...) — UUID.
//
// ATURAN (Decision 1 — slug vs UUID):
//   - tenant_id / id → UUID  (write/management ops)
//   - slug / subdomain → slug (read/display ops)
//
// ATURAN (Batch 5b — Paket):
//   - package_tier    → BASIC | VIP | PREMIUM
//   - billing_type    → MONTHLY | PER_EXAM
//   - max_participants → number

export const mockSuperDashboardStats = {
  total_schools: 12,
  active_exams: 4,
  total_participants_online: 345,
  vps_cpu_estimate: 42,
  vps_ram_used_mb: 1120,
  vps_ram_total_mb: 2048,
  active_tunnels: 8,
}

export const mockSuperDashboardLogs = [
  {
    id: 1,
    time: '23:15',
    event: 'Sync Dapodik Sukses',
    school: 'SMKN 1 Kawali',
    status: 'positive',
  },
  {
    id: 2,
    time: '22:40',
    event: 'Sewa Diperpanjang (1 Tahun)',
    school: 'SMA Terpadu Abdi Negara',
    status: 'info',
  },
  {
    id: 3,
    time: '21:10',
    event: 'Peringatan: Kuota Peserta Terlewati',
    school: 'SMK Pasundan',
    status: 'warning',
  },
]

export const mockSchoolTenant = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    tenant_id: '550e8400-e29b-41d4-a716-446655440001',
    slug: 'smkpasja',
    subdomain: 'smkpasja',
    npsn: '20254180',
    school_name: 'SMK Pasundan Jatinangor',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/8/82/SMA_Pasundan_Cikalongkulon.png',
    city: 'Sumedang',
    jenjang: 'SMK',
    program_duration_years: 3,
    contact_email: 'admin@smkpasja.sch.id',
    contact_phone: '081234567890',
    package_tier: 'PREMIUM', // ← BARU
    billing_type: 'MONTHLY', // ← BARU
    max_participants: 1000,
    is_suspended: false,
    is_active: true,
    sync_locked: false,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    tenant_id: '550e8400-e29b-41d4-a716-446655440002',
    slug: 'smknkawali',
    subdomain: 'smknkawali',
    npsn: '20254181',
    school_name: 'SMKN Kawali',
    logo_url: 'https://cdn.quasar.dev/logo/svg/quasar-logo.svg',
    city: 'Ciamis',
    jenjang: 'SMK',
    program_duration_years: 3,
    contact_email: 'admin@smknkawali.sch.id',
    contact_phone: '082345678901',
    package_tier: 'VIP', // ← BARU
    billing_type: 'MONTHLY', // ← BARU
    max_participants: 500,
    is_suspended: false,
    is_active: true,
    sync_locked: false,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    tenant_id: '550e8400-e29b-41d4-a716-446655440003',
    slug: 'mtsmaarifjtr',
    subdomain: 'mtsmaarifjtr',
    npsn: '20254182',
    school_name: 'MTs. Maarif Jatinangor',
    logo_url: 'https://cdn.quasar.dev/logo/svg/quasar-logo.svg',
    city: 'Sumedang',
    jenjang: 'MTs',
    program_duration_years: 3,
    contact_email: 'admin@mtsmaarifjtr.sch.id',
    contact_phone: '083456789012',
    package_tier: 'BASIC', // ← BARU
    billing_type: 'PER_EXAM', // ← BARU
    max_participants: 300,
    is_suspended: false,
    is_active: true,
    sync_locked: false,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    tenant_id: '550e8400-e29b-41d4-a716-446655440004',
    slug: 'smpn1jatinangor',
    subdomain: 'smpn1jatinangor',
    npsn: '20254200',
    school_name: 'SMP Negeri 1 Jatinangor',
    logo_url: 'https://cdn.quasar.dev/logo/svg/quasar-logo.svg',
    city: 'Sumedang',
    jenjang: 'SMP',
    program_duration_years: 3,
    contact_email: 'info@smpn1jatinangor.sch.id',
    contact_phone: '0227788001',
    package_tier: 'BASIC',
    billing_type: 'MONTHLY',
    max_participants: 600,
    is_suspended: false,
    is_active: true,
    sync_locked: false,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    tenant_id: '550e8400-e29b-41d4-a716-446655440005',
    slug: 'sman1cirebon',
    subdomain: 'sman1cirebon',
    npsn: '20254201',
    school_name: 'SMA Negeri 1 Cirebon',
    logo_url: 'https://cdn.quasar.dev/logo/svg/quasar-logo.svg',
    city: 'Cirebon',
    jenjang: 'SMA',
    program_duration_years: 3,
    contact_email: 'info@sman1cirebon.sch.id',
    contact_phone: '0231200001',
    package_tier: 'VIP',
    billing_type: 'PER_EXAM',
    max_participants: 800,
    is_suspended: false,
    is_active: true,
    sync_locked: false,
  },
]
