// src/mocks/handlers/superAdminHandlers.js
import {
  mockSuperDashboardStats,
  mockSuperDashboardLogs,
  mockSchoolTenant,
} from '../data/superadminData'

const DELAY = 300

export const superAdminHandlers = (mock) => {
  // GET: Statistik dashboard super admin
  mock.onGet('/super/dashboard/stats').reply(() => {
    return [200, mockSuperDashboardStats, { delay: DELAY }]
  })

  // GET: Log aktivitas sistem
  mock.onGet('/super/dashboard/logs').reply(() => {
    return [200, mockSuperDashboardLogs, { delay: DELAY }]
  })

  // Regex dengan capturing group: menangkap apapun di antara /super/schools/ dan /config
  mock.onGet(/\/super\/schools\/([^/]+)\/config/).reply((config) => {
    // 1. Ekstrak slug dari URL menggunakan regex match
    const match = config.url.match(/\/super\/schools\/([^/]+)\/config/)
    const slug = match ? match[1] : null

    console.log(`📢 Mock Tenant dipanggil dengan slug: "${slug}"`)

    // 2. Cari data sekolah yang slug-nya cocok (case-sensitive, tapi kita lowerCase-kan biar aman)
    const schoolData = mockSchoolTenant.find(
      (school) => school.slug.toLowerCase() === slug?.toLowerCase(),
    )

    // 3. Jika tidak ditemukan, kirim error 404 (seperti backend asli)
    if (!schoolData) {
      console.warn(`⚠️ Slug "${slug}" tidak ditemukan di mock data.`)
      return [
        404,
        { message: `Cluster sekolah '${slug}' tidak dikenali sistem.` },
        { delay: DELAY },
      ]
    }

    // 4. Jika ditemukan, kirim balik data sekolah (langsung pakai object nya)
    console.log(`✅ Data ditemukan: ${schoolData.school_name}`)
    return [200, schoolData, { delay: DELAY }]
  })

  mock.onGet('/super/schools').reply(() => {
    return [200, mockSchoolTenant, { delay: DELAY }]
  })
}
