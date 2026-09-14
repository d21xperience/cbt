// src/stores/auth.js
import { AuthService } from '@/services/AuthService'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { LocalStorage } from 'quasar'
// import { api } from '@/boot/axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: LocalStorage.getItem('cbt_user') || null,
    token: LocalStorage.getItem('cbt_token') || null,
    role: LocalStorage.getItem('cbt_role') || null,
    isAuthenticated: !!LocalStorage.getItem('cbt_token'),
  }),
  getters: {
    getUser: (state) => state.user,
    getRole: (state) => state.role,
    getStudent: (state) => {
      // Jika role participant, kembalikan user sebagai student
      if (state.role === 'PARTICIPANT' && state.user) {
        return {
          id: state.user.id || '',
          name: state.user.name || '',
          nis: state.user.nis || '',
          class: state.user.class || '',
          avatar: state.user.avatar || '',
        }
      }
      return {}
    },
  },
  actions: {
    async login(credentials, role) {
      try {
        const response = await AuthService.login(credentials, role)
        console.log("login...",response)
        const { token, user } = response.data
        // Simpan ke state
        this.token = token
        this.user = user
        this.role = role
        this.isAuthenticated = true

        // Simpan ke LocalStorage (agar tidak hilang saat refresh)
        LocalStorage.setItem('cbt_token', token)
        LocalStorage.setItem('cbt_role', role)
        LocalStorage.setItem('cbt_user', user)

        return { success: true, user }
      } catch (error) {
        // Tangani error di sini atau lempar ke komponen
        console.error('Login failed:', error)
        return { success: false, error: error.response?.data?.message || 'Login gagal' }
      }
    },

    async participantLogin(credentials) {
      // credentials = { id: '...', exam_identifier: '...' }
      const response = await AuthService.login(credentials, 'participant')
      console.log('✔ response', response)
      const { role, token, user } = response.data
      console.log(role)
      this.token = token
      this.user = user
      this.role = role
      this.isAuthenticated = true
      LocalStorage.setItem('cbt_token', token)
      LocalStorage.setItem('cbt_role', role)
      LocalStorage.setItem('cbt_user', user)
      return { success: true, user }
    },

    clearSession() {
      localStorage.clear()
      this.token = null
      this.role = null
      this.activeSchoolId = null
      this.schoolSlug = null
    },

    logout() {
      this.clearSession()
      // this.token = null
      // this.user = null
      // this.role = null
      // this.isAuthenticated = false
      LocalStorage.removeItem('cbt_token')
      LocalStorage.removeItem('cbt_role')
      LocalStorage.removeItem('cbt_user')
      // Panggil service logout jika perlu (ignore error)
      AuthService.logout().catch(() => {})
    },

    // Fungsi untuk restore session saat app dimuat
    restoreSession() {
      const token = LocalStorage.getItem('cbt_token')
      const role = LocalStorage.getItem('cbt_role')
      const user = LocalStorage.getItem('cbt_user')
      if (token && role && user) {
        this.token = token
        this.role = role
        this.user = JSON.parse(user)
        this.isAuthenticated = true
        return true
      }
      return false
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
