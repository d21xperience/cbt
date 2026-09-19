// src/boot/axios.js
import { boot } from 'quasar/wrappers'
import axios from 'axios'
import { LocalStorage, Notify } from 'quasar'
import { setupMockInterceptor } from '@/mocks/mockInterceptor'
import { getTenantSlug, persistTenantSlug, clearTenantSlug } from '@/utils/tenant'

const mockFlag = import.meta.env.QCLI_MOCK_MODE
const isMock = mockFlag === true || mockFlag === 'true'

const api = axios.create({
  baseURL: import.meta.env.QCLI_API_BASE_URL || '/api/v1/cbt',
  timeout: 15000,
})

if (import.meta.env.DEV && isMock) {
  console.warn('⚠️  MOCK MODE ACTIVE — data dummy digunakan')
  setupMockInterceptor(api)
}

api.interceptors.request.use((config) => {
  // ── Bypass flags untuk endpoint publik
  if (config.skipTenant !== true) {
    const tenantSlug = getTenantSlug()
    if (tenantSlug && tenantSlug !== 'null' && tenantSlug !== 'undefined') {
      config.headers['X-Tenant-Slug'] = tenantSlug
      // VER-002: persist untuk navigasi berikutnya (dev only)
      persistTenantSlug(tenantSlug)
    }
  }

  if (config.skipAuth !== true) {
    const token = LocalStorage.getItem('cbt_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const errCode = error.response?.data?.error

    // ── 401: clear all auth state
    if (status === 401) {
      LocalStorage.remove('cbt_token')
      LocalStorage.remove('cbt_role')
      LocalStorage.remove('cbt_user')
      LocalStorage.remove('cbt_eligible_exams')
      LocalStorage.remove('cbt_exam_id')
    }

    // ── 403 tenant_mismatch (VER-002)
    if (status === 403 && errCode === 'tenant_mismatch') {
      // Clear auth + tenant
      LocalStorage.remove('cbt_token')
      LocalStorage.remove('cbt_role')
      LocalStorage.remove('cbt_user')
      LocalStorage.remove('cbt_eligible_exams')
      LocalStorage.remove('cbt_exam_id')
      clearTenantSlug()

      // Notif + redirect ke landing
      Notify.create({
        type: 'negative',
        icon: 'error',
        message: 'Sesi tenant tidak cocok. Silakan pilih sekolah kembali.',
        position: 'top',
        timeout: 2000,
      })

      setTimeout(() => {
        window.location.href = window.location.origin + window.location.pathname + '#/'
      }, 800)
    }

    return Promise.reject(error)
  },
)

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }
