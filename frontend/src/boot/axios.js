// src/boot/axios.js
import { boot } from 'quasar/wrappers'
import axios from 'axios'
import { LocalStorage } from 'quasar' // ← TAMBAH
import { setupMockInterceptor } from '@/mocks/mockInterceptor'
import { getTenantSlug } from '@/utils/tenant'

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

// Request Interceptor: Inject Token
api.interceptors.request.use((config) => {
  const tenantSlug = getTenantSlug()
  if (tenantSlug && tenantSlug !== 'null' && tenantSlug !== 'undefined') {
    config.headers['X-Tenant-Slug'] = tenantSlug
  }

  // ✅ GUNAKAN Quasar LocalStorage — konsisten dengan stores/auth.js
  const token = LocalStorage.getItem('cbt_token')
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
      // ✅ Unify: pakai Quasar LocalStorage
      LocalStorage.remove('cbt_token')
      LocalStorage.remove('cbt_role')
      LocalStorage.remove('cbt_user')
      LocalStorage.remove('cbt_eligible_exams')
    }
    return Promise.reject(error)
  },
)

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }
