// src/mocks/handlers/authHandlers.js
import { mockSuperAdminLogin, mockUsersByTenant } from '../data/examdata'
import { mockStudentsByTenant, getStudentsByTenant } from '../data/studentsData'

// ── Generate mock JWT-B untuk peserta
const genMockParticipantToken = (studentId, tenant) =>
  `mock_participant_${tenant}_${studentId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

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

  // ── 4. PESERTA / EXAM LOGIN — body: { username (NIS), password }
  // Source of truth: Data Referensi → Siswa (mockStudentsByTenant)
  mock.onPost('/auth/exam/login').reply((config) => {
    const tenant = config.headers['X-Tenant-Slug'] || 'default'
    const body = JSON.parse(config.data || '{}')

    // Tenant harus valid (tidak fallback ke default untuk login)
    if (!mockStudentsByTenant[tenant]) {
      return [404, { error: `Tenant '${tenant}' tidak ditemukan` }]
    }

    const inputNis = String(body.username || '').trim()
    const inputPwd = String(body.password || '').trim()

    if (!inputNis || !inputPwd) {
      return [400, { error: 'NIS dan password wajib diisi' }]
    }

    const student = getStudentsByTenant(tenant).find(
      (s) => s.nis === inputNis && s.status === 'AKTIF' && s.exam_password === inputPwd,
    )

    if (!student) {
      return [401, { error: 'NIS atau password salah' }]
    }

    return [
      200,
      {
        role: 'PARTICIPANT',
        token: genMockParticipantToken(student.id, tenant),
        user: {
          id: student.id,
          name: student.nama,
          nis: student.nis,
          nisn: student.nisn,
          class: student.kelas_nama,
          tenant,
        },
        eligible_exams: [], // TODO F1b: derive dari jadwal × kelas
      },
    ]
  })
}
