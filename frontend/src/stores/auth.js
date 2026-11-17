// src/stores/auth.js
import { AuthService } from '@/services/AuthService'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { LocalStorage } from 'quasar'

// Normalisasi role code ke uppercase (source of truth = backend)
const normalizeRole = (role) => String(role || '').toUpperCase()

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: LocalStorage.getItem('cbt_user') || null,
    token: LocalStorage.getItem('cbt_token') || null, // JWT-A
    cbtExamToken: LocalStorage.getItem('cbt_exam_token') || null, // JWT-B
    role: LocalStorage.getItem('cbt_role') || null,
    isAuthenticated: !!LocalStorage.getItem('cbt_token'),
    cbtExamId: LocalStorage.getItem('cbt_exam_id'),
    examMode: LocalStorage.getItem('cbt_exam_mode') || '', // D.2: Mode Ujian (UTS, UAS, dll)
  }),
  getters: {
    getUser: (state) => state.user,
    getRole: (state) => state.role,
    getStudent: (state) => {
      if (state.role === 'PARTICIPANT' && state.user) {
        return {
          id: state.user.id || '',
          name: state.user.name || '',
          nisn: state.user.nisn || state.user.nis || '',
          class: state.user.rombel || state.user.class || '',
          avatar: state.user.avatar || '',
        }
      }
      return {}
    },
    getExamId: (state) => state.cbtExamId,
    getExamToken: (state) => state.cbtExamToken,
  },
  actions: {
    // ── Persistent helper: single source of truth untuk penulisan LocalStorage
    _persistAuth({ token, role, user, eligibleExams, examMode }) {
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
      
      // D.2: Persist examMode
      if (examMode !== undefined) {
        if (examMode) {
          LocalStorage.set('cbt_exam_mode', examMode)
        } else {
          LocalStorage.remove('cbt_exam_mode')
        }
        this.examMode = examMode || ''
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
      const { token, user, role, eligible_exams, exam_mode } = response.data
      this._persistAuth({ 
        token, 
        role: role || 'PARTICIPANT', 
        user, 
        eligibleExams: eligible_exams, 
        examMode: exam_mode // D.2: Teruskan exam_mode dari backend
      })
      return { success: true, user, eligibleExams: eligible_exams, examMode: exam_mode }
    },

    clearSession() {
      LocalStorage.remove('cbt_token')
      LocalStorage.remove('cbt_role')
      LocalStorage.remove('cbt_user')
      LocalStorage.remove('cbt_eligible_exams')
      LocalStorage.remove('cbt_exam_id')
      LocalStorage.remove('cbt_exam_token')
      LocalStorage.remove('cbt_exam_mode') // D.2

      this.token = null
      this.cbtExamToken = null
      this.role = null
      this.user = null
      this.cbtExamId = null
      this.examMode = '' // D.2
      this.isAuthenticated = false
    },

    logout() {
      this.clearSession()
      AuthService.logout().catch(() => {})
    },

    restoreSession() {
      const token = LocalStorage.getItem('cbt_token')
      const examToken = LocalStorage.getItem('cbt_exam_token')
      const role = LocalStorage.getItem('cbt_role')
      const user = LocalStorage.getItem('cbt_user')
      const examMode = LocalStorage.getItem('cbt_exam_mode') || '' // D.2
      if (token && role && user) {
        this.token = token
        this.cbtExamToken = examToken || null
        this.role = normalizeRole(role)
        this.user = user
        this.examMode = examMode // D.2
        this.isAuthenticated = true
        return true
      }
      return false
    },

    /**
     * Simpan JWT-B (Exam Gate Token session) — TERPISAH dari JWT-A.
     */
    setExamToken(jwtB, examId) {
      this.cbtExamToken = jwtB
      LocalStorage.set('cbt_exam_token', jwtB)
      LocalStorage.set('cbt_exam_id', examId)
      this.cbtExamId = examId
    },

    clearExamToken() {
      this.cbtExamToken = null
      LocalStorage.remove('cbt_exam_token')
      LocalStorage.remove('cbt_exam_id')
      this.cbtExamId = null
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
