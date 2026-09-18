// src/stores/auth.js
import { AuthService } from '@/services/AuthService'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { LocalStorage } from 'quasar'
// import { api } from '@/boot/axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: LocalStorage.getItem('cbt_user') || null, // ← LocalStorage, bukan localStorage
    token: LocalStorage.getItem('cbt_token') || null,
    role: LocalStorage.getItem('cbt_role') || null,
    isAuthenticated: !!LocalStorage.getItem('cbt_token'),
    cbtExamId: LocalStorage.getItem('cbt_exam_id'),
  }),
  getters: {
    getUser: (state) => state.user,
    getRole: (state) => state.role,
    getStudent: (state) => {
      console.log('state', state.user)
      // Jika role participant, kembalikan user sebagai student
      if (state.role === 'PARTICIPANT' && state.user) {
        return {
          id: state.user.id || '',
          name: state.user.name || '',
          nisn: state.user.nisn || '',
          class: state.user.rombel || '',
          avatar: state.user.avatar || '',
        }
      }
      return {}
    },
    // Getter
    getExamId: (state) => state.cbtExamId,
  },
  actions: {
    async login(credentials, role) {
      try {
        const response = await AuthService.login(credentials, role)
        console.log('login...', response)
        const { token, user } = response.data
        // Simpan ke state
        this.token = token
        this.user = user
        this.role = role
        this.isAuthenticated = true

        // Simpan ke LocalStorage (agar tidak hilang saat refresh)
        LocalStorage.setItem('cbt_token', token)
        LocalStorage.setItem('cbt_role', role)
        LocalStorage.setItem('cbt_user', JSON.stringify(user))

        return { success: true, user }
      } catch (error) {
        // Tangani error di sini atau lempar ke komponen
        console.error('Login failed:', error)
        return { success: false, error: error.response?.data?.message || 'Login gagal' }
      }
    },
    async proctorLogin(credentials) {
      const response = await AuthService.login(credentials, 'PROCTOR')
      const { token, role, user } = response.data
      this.token = token
      this.user = user
      this.role = role
      this.isAuthenticated = true
      LocalStorage.set('cbt_token', token)
      LocalStorage.set('cbt_role', role)
      LocalStorage.set('cbt_user', JSON.stringify(user))
      return { success: true, user, role }
    },
    async participantLogin(credentials) {
      // credentials = { username, password }
      const response = await AuthService.login(credentials, 'participant')
      const data = response.data
      const token = data.token
      const user = data.user
      const role = data.role

      this.token = token
      this.user = user
      this.role = role
      this.isAuthenticated = true

      LocalStorage.set('cbt_token', token)
      LocalStorage.set('cbt_role', role)
      LocalStorage.set('cbt_user', user) // ← object, biar Quasar stringify
      LocalStorage.set('cbt_eligible_exams', data.eligible_exams || [])

      return { success: true, user, eligibleExams: data.eligible_exams }
    },

    clearSession() {
      LocalStorage.remove('cbt_token')
      LocalStorage.remove('cbt_role')
      LocalStorage.remove('cbt_user')
      LocalStorage.remove('cbt_eligible_exams')
      this.token = null
      this.role = null
      this.user = null
      this.isAuthenticated = false
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
      const user = LocalStorage.getItem('cbt_user') // ← sudah object (parsed)
      if (token && role && user) {
        this.token = token
        this.role = role
        this.user = user // ← langsung, tidak perlu JSON.parse
        this.isAuthenticated = true
        return true
      }
      return false
    },
    // Setelah verify token sukses, ganti JWT-A dengan JWT-B
    setExamToken(jwtB, examId) {
      this.token = jwtB
      LocalStorage.set('cbt_token', jwtB)
      LocalStorage.set('cbt_exam_id', examId)
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
