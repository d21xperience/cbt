import { defineRouter } from '#q-app'
import { LocalStorage } from 'quasar'
// import { routes, handleHotUpdate } from 'vue-router/auto-routes'
import routes from './routes'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter((/* { store, ssrContext } */) => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
    // history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  // enable HMR for it
  // if (import.meta.hot) {
  //   handleHotUpdate(Router)
  // }

  // NAVIGATION GUARDS
  Router.beforeEach((to) => {
    const token = LocalStorage.getItem('cbt_token')
    const role = LocalStorage.getItem('cbt_role') // Isinya: 'SUPER_ADMIN', 'ADMIN_SEKOLAH', 'GURU_PROKTOR', atau 'SISWA'

    // ==========================================
    // KONDISI A: HALAMAN PUBLIK (requiresAuth: false / halaman login)
    // ==========================================
    if (to.meta.requiresAuth === false) {
      const loginRoutes = ['superadmin-login', 'admin-login', 'participant-login', 'teacher-login']

      // Peta tujuan dashboard yang sudah disesuaikan dengan allowedRoles di routes.js
      const dashboardMap = {
        SUPER_ADMIN: '/super',
        ADMIN_SEKOLAH: '/admin',
        GURU_PROKTOR: '/admin',
        PARTICIPANT: '/student',
      }

      // Jika user SUDAH login dan mencoba mengakses salah satu halaman login kembali
      if (token && loginRoutes.includes(to.name)) {
        // Alihkan otomatis ke dashboard role-nya, jika role tidak dikenal return ke halaman awal
        return dashboardMap[role] || '/'
      }

      return true // Izinkan akses jika belum login
    }

    // ==========================================
    // KONDISI B: HALAMAN PRIVAT (Butuh Login / Proteksi RBAC)
    // ==========================================

    // 1. Cek token: Jika mencoba masuk ke halaman privat tanpa token, tendang ke login siswa
    if (!token) {
      return '/auth/participant'
    }

    // 2. Cek Hak Akses Role (RBAC) menggunakan properti allowedRoles dari routes.js
    // Gunakan to.meta.allowedRoles (sesuai routes.js baru) atau fallback ke to.meta.roles jika pakai format lama
    const requiredRoles = to.meta.allowedRoles || to.meta.roles
    if (requiredRoles) {
      // Jika role user saat ini tidak terdaftar di rute allowedRoles/roles
      if (!requiredRoles.includes(role)) {
        // $q.notify({
        //   type: 'negative',
        //   message: 'Akses ditolak! Anda tidak memiliki izin untuk membuka menu ini.'
        // })

        // Kembalikan user ke lingkungan dashboard aslinya yang aman
        const dashboardMap = {
          SUPER_ADMIN: '/super',
          ADMIN_SEKOLAH: '/admin',
          GURU_PROKTOR: '/admin',
          PARTICIPANT: '/student',
        }
        return dashboardMap[role] || '/auth/participant'
      }
    }

    return true // Izinkan akses jika token valid dan role sesuai
  })
  return Router
})
