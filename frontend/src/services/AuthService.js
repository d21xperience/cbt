// src/services/AuthService.js
import { api } from '@/boot/axios'

export const AuthService = {
  login(credentials, role) {
    const normalizedRole = String(role || '').toUpperCase()

    switch (normalizedRole) {
      case 'SUPER_ADMIN':
        // Platform-scoped: tidak terikat tenant, bypass header X-Tenant-Slug.
        return api.post('/auth/super/login', credentials, {
          skipTenant: true,
          skipAuth: true,
        })
      case 'ADMIN':
        console.log('ADMIN', credentials)
        return api.post('/auth/admin/login', credentials)
      // case 'PROCTOR':
      case 'PROCTOR':
        return api.post('/auth/proctor/login', {
          username: credentials.username || '',
          password: credentials.password || '',
        })
      case 'PARTICIPANT':
        return api.post('/auth/exam/login', {
          username: credentials.username || '',
          password: credentials.password || '',
        })
      default:
        return Promise.reject(new Error(`Unknown role: ${role}`))
    }
  },

  async logout() {
    try {
      return await api.post('/auth/logout')
    } catch {
      console.log('logout...')
    }
  },

  refreshToken() {
    return api.post('/auth/refresh')
  },
  qrLogin(token) {
    return api.post('/auth/qr-login', { token })
  },
}
