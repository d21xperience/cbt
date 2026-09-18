// src/services/AuthService.js
import { api } from '@/boot/axios'

export const AuthService = {
  login(credentials, role) {
    const normalizedRole = String(role || '').toUpperCase()

    switch (normalizedRole) {
      case 'SUPER_ADMIN':
        return api.post('/auth/super/login', credentials)
      case 'ADMIN':
        return api.post('/auth/admin/login', credentials)
      case 'PROCTOR':
      case 'TEACHER':
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

  logout() {
    return api.post('/auth/logout').catch(() => {})
  },

  refreshToken() {
    return api.post('/auth/refresh')
  },
}
