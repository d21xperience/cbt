// src/router/routes.js
const routes = [
  {
    path: '/',
    component: () => import('@/layouts/LandingLayout.vue'),
    children: [{ path: '', component: () => import('@/pages/LandingPage.vue') }],
    meta: { requiresAuth: false },
  },
  // AUTHENTICATION
  {
    path: '/auth',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      { path: '', redirect: '/auth/participant' },

      // ✅ Super admin = platform-level, TIDAK butuh tenant
      {
        path: 'super',
        name: 'superadmin-login',
        component: () => import('@/pages/auth/SuperAdminLogin.vue'),
      },

      // ✅ Tenant-scoped — butuh tenant
      {
        path: 'participant',
        name: 'participant-login',
        component: () => import('@/pages/auth/ParticipantLogin.vue'),
        meta: { requiresTenant: true },
      },
      {
        path: 'admin',
        name: 'admin-login',
        component: () => import('@/pages/auth/AdminLogin.vue'),
        meta: { requiresTenant: true },
      },
      {
        path: 'teacher',
        name: 'teacher-login',
        component: () => import('@/pages/auth/TeacherLogin.vue'),
        meta: { requiresTenant: true },
      },
    ],
    meta: { requiresAuth: false },
  },
  // SUPER ADMIN
  {
    path: '/super',
    component: () => import('@/layouts/SuperAdminLayout.vue'),
    meta: { requiresAuth: true, allowedRoles: ['SUPER_ADMIN'] },
    children: [
      {
        path: '',
        name: 'super-dashboard',
        component: () => import('@/pages/super/SuperDashboard.vue'),
      },
      {
        path: 'schools',
        name: 'manajemen-sekolah',
        component: () => import('@/pages/super/SchoolsManagement.vue'),
      },
      {
        path: 'schools/pending',
        name: 'super-schools-pending',
        component: () => import('@/pages/super/SchoolsPending.vue'),
      },
      {
        path: 'billing',
        name: 'manajemen-biling',
        component: () => import('@/pages/super/BillingManagement.vue'),
      },
      {
        path: 'log-telemetri',
        name: 'log-telemetri',
        component: () => import('@/pages/super/TelemetryLogs.vue'),
      },
    ],
  },
  // ADMIN
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresTenant: true, allowedRoles: ['ADMIN'] },
    children: [
      { path: '', name: 'admin-dashboard', component: () => import('@/pages/admin/Dashboard.vue') },
      { path: 'sync', name: 'admin-sync', component: () => import('@/pages/admin/SyncSiakad.vue') },
      {
        path: 'sessions',
        name: 'admin-sessions',
        component: () => import('@/pages/admin/Sessions.vue'),
      },
      {
        path: 'questions',
        name: 'admin-questions',
        component: () => import('@/pages/admin/Questions.vue'),
      },
      {
        path: 'participants',
        name: 'admin-participants',
        component: () => import('@/pages/admin/Participants.vue'),
      },
      {
        path: 'archive',
        name: 'admin-archive',
        component: () => import('@/pages/admin/Archive.vue'),
      },
      {
        path: 'kartu-ujian',
        name: 'admin-exam-card',
        component: () => import('@/pages/admin/ExamCardManagement.vue'),
      },
      {
        path: 'manajemen-ujian',
        name: 'admin-exam-management',
        component: () => import('@/pages/admin/ExamManagement.vue'),
      },
      {
        path: 'manajemen-user',
        name: 'admin-user-management',
        component: () => import('@/pages/admin/UserManagement.vue'),
      },
      {
        path: 'token-ujian',
        name: 'admin-token-display',
        component: () => import('@/pages/admin/TokenDisplay.vue'),
        meta: { allowedRoles: ['ADMIN', 'PROCTOR', 'SUPER_ADMIN'] },
      },
      {
        path: 'payment-gates',
        name: 'admin-payment-gates',
        component: () => import('@/pages/admin/PaymentGates.vue'),
      },
    ],
  },
  // STUDENT
  {
    path: '/student',
    component: () => import('@/layouts/StudentLayout.vue'),
    meta: { requiresAuth: true, requiresTenant: true, allowedRoles: ['PARTICIPANT'] },
    children: [
      { path: '', name: 'waiting-room', component: () => import('@/pages/exam/WaitingRoom.vue') },
      {
        path: 'history',
        name: 'exam-history',
        component: () => import('@/pages/exam/ExamHistory.vue'),
      },
      {
        path: 'schedule',
        name: 'exam-schedule',
        component: () => import('@/pages/exam/ExamSchedule.vue'),
      },
      {
        path: 'profile',
        name: 'exam-user-profile',
        component: () => import('@/pages/exam/ExamUserPorfile.vue'),
      },
    ],
  },
  // PROCTOR
  {
    path: '/proctor',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: {
      requiresAuth: true,
      requiresTenant: true,
      allowedRoles: ['PROCTOR', 'TEACHER', 'ADMIN'],
    },
    children: [
      {
        path: '',
        name: 'proctor-dashboard',
        component: () => import('@/pages/proctor/ProctorDashboard.vue'),
      },
      {
        path: 'monitoring/:sessionId',
        name: 'proctor-monitoring',
        component: () => import('@/pages/proctor/ProctorMonitoring.vue'),
      },
    ],
  },
  // EXAM
  {
    path: '/exam',
    component: () => import('@/layouts/ExamLayout.vue'),
    meta: { requiresAuth: true, requiresTenant: true, allowedRoles: ['PARTICIPANT'] },
    children: [
      { path: '', name: 'exam-room', component: () => import('@/pages/exam/ExamRoom.vue') },
    ],
  },
  // Catch-all
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
    meta: { requiresAuth: false },
  },
]

export default routes
