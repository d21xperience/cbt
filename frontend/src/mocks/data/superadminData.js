// src/mocks/data/superAdminData.js

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

// src/mocks/data/superadminData.js
export const mockSchoolTenant = [
  {
    id: 1,
    slug: 'smkpasja',
    school_name: 'SMK Pasundan Jatinangor',
    logo_url:
      'https://upload.wikimedia.org/wikipedia/commons/8/82/SMA_Pasundan_Cikalongkulon.png?utm_source=id.wikipedia.org&utm_campaign=index&utm_content=original',
    is_suspended: false,
    city: 'Sumedang',
  },
  // {
  //   id: 2,
  //   slug: 'mtsmaarifcikeruh',
  //   school_name: 'MTs. Maarif Cikeruh',
  //   logo_url: 'https://cdn.quasar.dev/logo/svg/quasar-logo.svg',
  //   is_suspended: false,
  //   city: 'Sumedang',
  // },
  // {
  //   id: 3,
  //   slug: 'smknkawali', // <-- Tambahkan properti ini untuk pencocokan
  //   school_name: 'SMKN Kawali', // <-- Ubah dari 'schoolname' ke 'school_name'
  //   logo_url: 'https://cdn.quasar.dev/logo/svg/quasar-logo.svg', // <-- Ubah dari 'log_url'
  //   is_suspended: false, // <-- Ubah dari 'is_suspend',
  //   city: 'Ciamis',
  // },
]
