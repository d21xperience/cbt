// src/mocks/handlers/authHandlers.js
import { mockSuperAdminLogin, mockUsersByTenant } from '../data/examdata'

export const authHandlers = (mock) => {
  // ── 1. SUPER ADMIN LOGIN
  mock.onPost('/auth/super/login').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    if (body.username === 'superadmin' && body.password === 'superadmin123') {
      return [200, mockSuperAdminLogin]
    }
    return [401, { error: 'Kredensial salah' }]
  })

  // ── 2. ADMIN LOGIN — body: { username, password }
  mock.onPost('/auth/admin/login').reply((config) => {
    const tenant = config.headers['X-Tenant-Slug'] || 'default'
    const body = JSON.parse(config.data || '{}')

    const tenantData = mockUsersByTenant[tenant]
    if (!tenantData) return [404, { error: `Tenant '${tenant}' tidak ditemukan` }]

    const user = tenantData.admins?.find(
      (u) => u.username === body.username && u.password === body.password,
    )

    if (user) {
      return [200, { token: 'mock-admin-token', role: 'ADMIN', user: { ...user, tenant } }]
    }
    return [401, { error: 'Username atau password admin salah' }]
  })

  // ── 3. PROCTOR / TEACHER LOGIN — body: { username, password }
  mock.onPost('/auth/proctor/login').reply((config) => {
    const tenant = config.headers['X-Tenant-Slug'] || 'default'
    const body = JSON.parse(config.data || '{}')

    const tenantData = mockUsersByTenant[tenant]
    if (!tenantData) return [404, { error: `Tenant '${tenant}' tidak ditemukan` }]

    const user = tenantData.teachers?.find(
      (u) => u.username === body.username && u.password === body.password,
    )

    if (user) {
      return [200, { token: 'mock-teacher-token', role: 'PROCTOR', user: { ...user, tenant } }]
    }
    return [401, { error: 'Username atau password guru salah' }]
  })

  // ── 4. PESERTA / EXAM LOGIN — body: { username, password }
  mock.onPost('/auth/exam/login').reply((config) => {
    const tenant = config.headers['X-Tenant-Slug'] || 'default'
    const body = JSON.parse(config.data || '{}')

    const tenantData = mockUsersByTenant[tenant]
    if (!tenantData) {
      return [404, { error: `Tenant '${tenant}' tidak ditemukan` }]
    }

    const user = tenantData.participants?.find(
      (u) => u.username === body.username && u.password === body.password,
    )

    if (user) {
      return [
        200,
        {
          role: user.role || 'PARTICIPANT',
          token: user.token,
          user: {
            id: user.id,
            name: user.user?.name,
            nis: user.user?.nis,
            class: user.user?.class,
            tenant,
          },
          eligible_exams: user.eligible_exams || [],
        },
      ]
    }

    return [401, { error: 'Username atau password salah' }]
  })
}
