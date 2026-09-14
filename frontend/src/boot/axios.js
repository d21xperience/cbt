// src/boot/axios.js
import { boot } from 'quasar/wrappers'
import axios from 'axios'
import { setupMockInterceptor } from '@/mocks/mockInterceptor'
import { getTenantSlug } from '@/utils/tenant'

const api = axios.create({
  baseURL: import.meta.env.QCLI_API_BASE_URL || '/api/v1/cbt', // Langsung hardcode base URL untuk sekarang
  timeout: 15000,
})

// console.log('🔍 Status Mock Mode:', IS_MOCK_MODE ? 'AKTIF' : 'NONAKTIF')

if (import.meta.env.QCLI_MOCK_MODE === true) {
  console.warn('🔶 MOCK MODE ACTIVE - Menggunakan data dummy')
  setupMockInterceptor(api)
} else {
  console.log('⚪ MOCK MODE INACTIVE - Koneksi ke backend asli')
}

// Request Interceptor: Inject Token
api.interceptors.request.use((config) => {
  // Inject X-Tenant-Slug ke semua request secara otomatis
  const tenantSlug = getTenantSlug()
  if (tenantSlug) {
    config.headers['X-Tenant-Slug'] = tenantSlug
  }

  const token = localStorage.getItem('cbt_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response Interceptor: Handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cbt_token')
      localStorage.removeItem('cbt_role')
      // window.location.href = '/'
    }
    return Promise.reject(error)
  },
)

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }
