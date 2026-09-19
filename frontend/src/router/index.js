import { defineRouter } from '#q-app'
import { LocalStorage } from 'quasar'
import routes from './routes'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router'
import { getTenantSlug } from '@/utils/tenant'

// ── RBAC: role codes adalah SOURCE OF TRUTH dari backend (lihat BACKEND_CONTRACT §JWT payload)
// Valid: SUPER_ADMIN, ADMIN, PROCTOR, TEACHER, PARTICIPANT
const DASHBOARD_MAP = {
  SUPER_ADMIN: '/super',
  ADMIN: '/admin',
  PROCTOR: '/admin',
  TEACHER: '/admin',
  PARTICIPANT: '/student',
}

// Fallback login sesuai prefix route (B.4.3)
const loginFallbackByPath = (path) => {
  if (path.startsWith('/super')) return '/auth/super'
  if (path.startsWith('/admin')) return '/auth/admin'
  if (path.startsWith('/proctor')) return '/auth/teacher'
  if (path.startsWith('/exam') || path.startsWith('/student')) return '/auth/participant'
  return '/auth/participant'
}

export default defineRouter(() => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
  })

  Router.beforeEach((to) => {
    const token = LocalStorage.getItem('cbt_token')
    const role = LocalStorage.getItem('cbt_role')

    // ══════════════════════════════════════════════════════
    // VER-002: CEK TENANT DULU — sebelum cek auth
    // Alasan: route child bisa punya requiresTenant: true,
    // tapi parent-nya requiresAuth: false (mis. /auth/admin).
    // Kalau cek auth dulu, tenant check akan ke-skip.
    // ══════════════════════════════════════════════════════
    if (to.meta.requiresTenant) {
      const tenant = getTenantSlug()
      if (!tenant) {
        return { path: '/', query: { needTenant: '1' } }
      }
    }

    // ── KONDISI A: HALAMAN PUBLIK
    if (to.meta.requiresAuth === false) {
      const loginRoutes = ['superadmin-login', 'admin-login', 'participant-login', 'teacher-login']

      if (token && loginRoutes.includes(to.name)) {
        return DASHBOARD_MAP[role] || '/'
      }
      return true
    }

    // ── KONDISI B: HALAMAN PRIVAT
    if (!token) {
      return loginFallbackByPath(to.path)
    }

    const requiredRoles =
      to.meta.allowedRoles || to.meta.roles || (to.meta.role ? [to.meta.role] : null)

    if (requiredRoles && Array.isArray(requiredRoles) && requiredRoles.length > 0) {
      if (!requiredRoles.includes(role)) {
        return DASHBOARD_MAP[role] || loginFallbackByPath(to.path)
      }
    }

    return true
  })

  return Router
})
