// # Layanan login & logout global
// src/services/AuthService.js
import { api } from '@/boot/axios'

// Gunakan object literal, bukan class, untuk menghindari error 'this'
export const AuthService = {
  login(credentials, role) {
    // Kirim role agar backend/mock bisa membedakan
    console.log('LOGIN....')
    console.log(credentials, role)

    let response = null
    switch (role) {
      case 'SUPER_ADMIN':
        response = api.post('/auth/superadmin/login', {
          ...credentials,
          role: 'SUPER_ADMIN',
        })
        break
      case 'ADMIN':
        // login untuk admin/guru
        response = api.post('/auth/admin/login', {
          ...credentials,
          role: 'ADMIN',
        })
        break

      default:
        response = api.post('/auth/exam/login', {
          ...credentials,
          role: 'PARTICIPANT',
        })
        break
    }

    return response
  },

  logout() {
    return api.post('/auth/logout')
  },

  refreshToken() {
    return api.post('/auth/refresh')
  },
}
