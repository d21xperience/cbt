// src/mocks/handlers/authHandlers.js
import { mockSuperAdminLogin, mockUsersByTenant } from '../data/examdata'

export const authHandlers = (mock) => {
  // Super Admin Login
  mock.onPost('/auth/super/login').reply((config) => {
    const body = JSON.parse(config.data)
    if (body.username === 'superadmin' && body.password === 'superadmin123') {
      return [200, mockSuperAdminLogin]
    }
    return [401, { message: 'Kredensial salah' }]
  })

  // ========== 2. LOGIN ADMIN (Multi-Tenant) ==========
  mock.onPost('/auth/admin/login').reply((config) => {
    console.log('cek disini....')
    const tenant = config.headers['X-Tenant-Slug'] || 'default'
    const body = JSON.parse(config.data)

    const tenantData = mockUsersByTenant[tenant]
    if (!tenantData) return [404, { message: 'Tenant tidak ditemukan' }]

    const user = tenantData.admins.find(
      (u) => u.email === body.email && u.password === body.password,
    )

    if (user) {
      return [200, { token: 'mock-admin-token', user: { ...user, tenant } }]
    }
    return [401, { message: 'Email atau password admin salah' }]
  })

  // ========== 3. LOGIN GURU / PROCTOR (Multi-Tenant) ==========
  mock.onPost('/auth/teacher/login').reply((config) => {
    const tenant = config.headers['X-Tenant-Slug'] || 'default'
    const body = JSON.parse(config.data)

    const tenantData = mockUsersByTenant[tenant]
    if (!tenantData) return [404, { message: 'Tenant tidak ditemukan' }]

    const user = tenantData.teachers.find(
      (u) => u.email === body.email && u.password === body.password,
    )

    if (user) {
      return [200, { token: 'mock-teacher-token', user: { ...user, tenant } }]
    }
    return [401, { message: 'Email atau password guru salah' }]
  })

  // ========== 3. LOGIN PESERTA (Multi-Tenant) ==========
  mock.onPost('/auth/exam/login').reply((config) => {
    // 📌 BACA TENANT DARI HEADER (KIRIM OTOMATIS OLEH AXIOS)
    const tenant = config.headers['X-Tenant-Slug'] || 'default'
    const body = JSON.parse(config.data)
    console.log('📢 body', body)
    // Cari user berdasarkan tenant dan ID
    const tenantData = mockUsersByTenant[tenant]
    console.log('📢 tenantData', tenantData)

    if (!tenantData) {
      return [404, { message: `Tenant '${tenant}' tidak ditemukan` }]
    }

    const user = tenantData.participants.find(
      (u) => u.id === body.id && u.exam_identifier === body.exam_identifier,
    )
    console.log('📢 user', user)

    if (user) {
      // Kirim balik data user (copy dari template, tapi timpa dengan data spesifik tenant)
      return [
        200,
        {
          role: user.role,
          token: user.token,
          user: {
            id: user.id,
            name: user.user.name,
            nis: user.user.nis,
            class: user.user.class,
            tenant: tenant, // Sertakan tenant di response agar frontend tahu
          },
        },
      ]
    }

    return [401, { message: 'Username atau password salah' }]
  })
}
