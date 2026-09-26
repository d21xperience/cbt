// src/mocks/data/infrastructureData.js
// Mock data untuk Infrastructure (VPS/Domain/TLS) — VER-013 pending.
// `durasi_sewa` dalam bulan: 1, 3, 6, 12, 24, 36

export const mockVps = [
  {
    id: 'vps-001',
    vendor: 'DigitalOcean',
    package: 'VPS 4GB / 2 vCPU',
    biaya_bulanan: 400000,
    tanggal_sewa: '2026-01-15',
    durasi_sewa: 12,                    // ← BARU (1 tahun)
    tanggal_expiry: '2027-01-15',
    notes: 'Server utama CBT Engine',
  },
  {
    id: 'vps-002',
    vendor: 'Biznet Gio',
    package: 'VPS 2GB / 1 vCPU',
    biaya_bulanan: 200000,
    tanggal_sewa: '2026-07-10',
    durasi_sewa: 3,                     // ← BARU (3 bulan)
    tanggal_expiry: '2026-10-10',
    notes: 'Backup & staging',
  },
  {
    id: 'vps-003',
    vendor: 'AWS Lightsail',
    package: 'VPS 1GB / 1 vCPU',
    biaya_bulanan: 150000,
    tanggal_sewa: '2026-06-15',
    durasi_sewa: 3,                     // ← BARU
    tanggal_expiry: '2026-09-15',
    notes: 'Expired — perlu perpanjangan atau migrasi',
  },
]

export const mockDomains = [
  {
    id: 'dom-001',
    domain: 'ujian.pw',
    registrar: 'Namecheap',
    biaya_tahunan: 180000,
    tanggal_registrasi: '2025-03-01',
    durasi_sewa: 24,                    // ← BARU (2 tahun)
    tanggal_expiry: '2027-03-01',
    notes: 'Domain utama platform',
  },
  {
    id: 'dom-002',
    domain: 'cbt-engine.id',
    registrar: 'IDCloudHost',
    biaya_tahunan: 150000,
    tanggal_registrasi: '2024-11-10',
    durasi_sewa: 24,                    // ← BARU (2 tahun)
    tanggal_expiry: '2026-11-10',
    notes: 'Backup domain',
  },
]

export const mockTlsCerts = [
  {
    id: 'tls-001',
    domain: '*.ujian.pw',
    issuer: "Let's Encrypt",
    tipe: 'wildcard',
    tanggal_issue: '2026-06-25',
    durasi_sewa: 3,                     // ← BARU (3 bulan)
    tanggal_expiry: '2026-09-25',
    notes: 'Auto-renew via certbot',
  },
  {
    id: 'tls-002',
    domain: 'cbt-engine.id',
    issuer: "Let's Encrypt",
    tipe: 'single',
    tanggal_issue: '2026-08-15',
    durasi_sewa: 3,                     // ← BARU
    tanggal_expiry: '2026-11-15',
    notes: '',
  },
  {
    id: 'tls-003',
    domain: 'api.ujian.pw',
    issuer: 'Cloudflare Origin CA',
    tipe: 'single',
    tanggal_issue: '2026-06-10',
    durasi_sewa: 3,                     // ← BARU
    tanggal_expiry: '2026-09-10',
    notes: 'Expired — perlu reissue',
  },
]
