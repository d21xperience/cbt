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
  PROCTOR: '/proctor',
  TEACHER: '/proctor',
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
/**
 * Safe redirect — never redirect to the same path (prevents infinite loop).
 * @returns {string|false} target path, or false if it would self-redirect
 */
const safeRoleRedirect = (role, currentPath) => {
  const target = DASHBOARD_MAP[role]
  if (target && target !== currentPath) return target

  // Fallback: login page sesuai prefix path
  const fallback = loginFallbackByPath(currentPath)
  if (fallback !== currentPath) return fallback

  // Tidak ada target yang aman — batalkan navigasi
  return false
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

  Router.beforeEach(async (to) => {
    const token = LocalStorage.getItem('cbt_token')
    const role = LocalStorage.getItem('cbt_role')

    // ══════════════════════════════════════════════════════
    // GUARD 0 — VER-002: tenant check untuk route tenant-scoped
    // ══════════════════════════════════════════════════════
    if (to.meta.requiresTenant) {
      const tenant = getTenantSlug()
      if (!tenant) {
        return { path: '/', query: { needTenant: '1' } }
      }
    }

    // ══════════════════════════════════════════════════════
    // GUARD 1 — sub-role homeroom (Batch C1-fix)
    // Hanya cek untuk role tertentu (mis. PROCTOR/TEACHER)
    // ══════════════════════════════════════════════════════
    if (to.meta.onlyHomeroomForRoles && to.meta.onlyHomeroomForRoles.includes(role)) {
      const { useProctorProfile } = await import('@/composables/proctor/useProctorProfile')
      const { fetchProfile, isHomeroomTeacher } = useProctorProfile()
      await fetchProfile()

      if (!isHomeroomTeacher.value) {
        // Redirect ke proctor dashboard (safe: cek self-redirect)
        const target = '/proctor'
        if (target !== to.path) return { path: target }
        // Already there but somehow blocked — abort
        return false
      }
    }

    // ══════════════════════════════════════════════════════
    // GUARD 2 — HALAMAN PUBLIK (login, landing)
    // ══════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════
    // GUARD 2 — HALAMAN PUBLIK (login, landing)
    // ══════════════════════════════════════════════════════
    if (to.meta.requiresAuth === false) {
      const loginRoutes = ['superadmin-login', 'admin-login', 'participant-login', 'teacher-login']

      if (token && loginRoutes.includes(to.name)) {
        // ── FIX: Cek apakah URL tenant berbeda dari session tenant
        // (stale credential dari tenant lain — tampilkan login page fresh)
        const { getTenantSlug } = await import('@/utils/tenant')
        const urlTenant = getTenantSlug()
        const sessionTenant = LocalStorage.getItem('cbt_tenant_slug')

        if (urlTenant && sessionTenant && urlTenant !== sessionTenant) {
          // Tenant mismatch — jangan auto-redirect; user akan login fresh
          console.info(
            `[Router] Tenant mismatch (URL: ${urlTenant}, session: ${sessionTenant}) — showing fresh login`,
          )
          return true
        }

        const target = safeRoleRedirect(role, to.path)
        if (target) return target
        return true
      }
      return true
    }

    // ══════════════════════════════════════════════════════
    // GUARD 3 — HALAMAN PRIVAT (butuh token)
    // ══════════════════════════════════════════════════════
    if (!token) {
      const fallback = loginFallbackByPath(to.path)
      if (fallback !== to.path) return fallback
      return false
    }

    // ══════════════════════════════════════════════════════
    // GUARD 4 — RBAC: role check
    // ══════════════════════════════════════════════════════
    const requiredRoles =
      to.meta.allowedRoles || to.meta.roles || (to.meta.role ? [to.meta.role] : null)

    if (requiredRoles && Array.isArray(requiredRoles) && requiredRoles.length > 0) {
      if (!requiredRoles.includes(role)) {
        // Redirect ke dashboard role yang benar (safe)
        const target = safeRoleRedirect(role, to.path)
        if (target) return target
        // Tidak ada redirect aman — abort (jangan render unauthorized page)
        return false
      }
    }

    return true
  })

  return Router
})
