// src/stores/auth.js
import { AuthService } from '@/services/AuthService'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { LocalStorage } from 'quasar'

// Normalisasi role code ke uppercase (source of truth = backend)
const normalizeRole = (role) => String(role || '').toUpperCase()

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: LocalStorage.getItem('cbt_user') || null,
    token: LocalStorage.getItem('cbt_token') || null,
    role: LocalStorage.getItem('cbt_role') || null,
    isAuthenticated: !!LocalStorage.getItem('cbt_token'),
    cbtExamId: LocalStorage.getItem('cbt_exam_id'),
  }),
  getters: {
    getUser: (state) => state.user,
    getRole: (state) => state.role,
    getStudent: (state) => {
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
    getExamId: (state) => state.cbtExamId,
  },
  actions: {
    // ── Persistent helper: single source of truth untuk penulisan LocalStorage
        _persistAuth({ token, role, user, eligibleExams }) {
      const normalizedRole = normalizeRole(role)
      // Defensive: pastikan user selalu object minimal
      const safeUser = user && typeof user === 'object' ? user : { role: normalizedRole }

      this.token = token
      this.user = safeUser
      this.role = normalizedRole
      this.isAuthenticated = true

      LocalStorage.set('cbt_token', token)
      LocalStorage.set('cbt_role', normalizedRole)
      LocalStorage.set('cbt_user', safeUser)

      if (eligibleExams !== undefined) {
        LocalStorage.set('cbt_eligible_exams', eligibleExams || [])
      }
    },

    async login(credentials, role) {
      try {
        const response = await AuthService.login(credentials, role)
        const { token, user } = response.data
        this._persistAuth({ token, role, user })
        return { success: true, user }
      } catch (error) {
        console.error('Login failed:', error)
        return { success: false, error: error.response?.data?.message || 'Login gagal' }
      }
    },

    async proctorLogin(credentials) {
      const response = await AuthService.login(credentials, 'PROCTOR')
      const { token, role, user } = response.data
      this._persistAuth({ token, role: role || 'PROCTOR', user })
      return { success: true, user, role: this.role }
    },

    async participantLogin(credentials) {
      const response = await AuthService.login(credentials, 'participant')
      const { token, user, role, eligible_exams } = response.data
      this._persistAuth({ token, role: role || 'PARTICIPANT', user, eligibleExams: eligible_exams })
      return { success: true, user, eligibleExams: eligible_exams }
    },

    clearSession() {
      LocalStorage.remove('cbt_token')
      LocalStorage.remove('cbt_role')
      LocalStorage.remove('cbt_user')
      LocalStorage.remove('cbt_eligible_exams')
      LocalStorage.remove('cbt_exam_id') // B.2.3 fixed

      this.token = null
      this.role = null
      this.user = null
      this.cbtExamId = null
      this.isAuthenticated = false
    },

    logout() {
      this.clearSession()
      AuthService.logout().catch(() => {})
    },

    restoreSession() {
      const token = LocalStorage.getItem('cbt_token')
      const role = LocalStorage.getItem('cbt_role')
      const user = LocalStorage.getItem('cbt_user')
      if (token && role && user) {
        this.token = token
        this.role = normalizeRole(role)
        this.user = user
        this.isAuthenticated = true
        return true
      }
      return false
    },

    setExamToken(jwtB, examId) {
      this.token = jwtB
      LocalStorage.set('cbt_token', jwtB)
      LocalStorage.set('cbt_exam_id', examId)
      this.cbtExamId = examId
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
