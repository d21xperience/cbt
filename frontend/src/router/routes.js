// src/router/routes.js
const routes = [
  {
    path: '/',
    component: () => import('@/layouts/LandingLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('@/pages/LandingPage.vue'),
      },
    ],
    meta: { requiresAuth: false },
  },

  {
    path: '/auth',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        redirect: '/auth/participant',
      },
      {
        path: 'participant',
        name: 'participant-login',
        component: () => import('@/pages/auth/ParticipantLogin.vue'),
      },
      {
        path: 'admin',
        name: 'admin-login',
        component: () => import('@/pages/auth/AdminLogin.vue'),
      },
      {
        path: 'super',
        name: 'superadmin-login',
        component: () => import('@/pages/auth/SuperAdminLogin.vue'),
      },
      {
        path: 'teacher',
        name: 'teacher-login',
        component: () => import('@/pages/auth/TeacherLogin.vue'), // Halaman Login Guru Baru
      },
    ],
    meta: { requiresAuth: false },
  },
  {
    path: '/super',
    component: () => import('@/layouts/SuperAdminLayout.vue'), // Atau SuperLayout khusus
    meta: { requiresAuth: true, role: ['SUPER_ADMIN'] },
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
        path: 'billing',
        name: 'manajemen-biling',
        component: () => import('@/pages/super/BillingManagement.vue'), // Menghubungkan ke halaman keuangan sewa
      },
      {
        path: 'log-telemetri',
        name: 'log-telemetri',
        component: () => import('@/pages/super/TelemetryLogs.vue'), // Menghubungkan ke halaman keuangan sewa
      },
    ],
  },

  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
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
    ],
    meta: { requiresAuth: true, roles: ['ADMIN'] },
  },

  {
    path: '/student',
    component: () => import('@/layouts/StudentLayout.vue'),
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
    meta: { requiresAuth: true, roles: ['PARTICIPANT'], allowedRoles: ['PARTICIPANT'] },
  },
  {
    path: '/exam',
    component: () => import('@/layouts/ExamLayout.vue'),
    children: [{ path: '', component: () => import('@/pages/exam/ExamRoom.vue') }],
    meta: { requiresAuth: true, roles: ['PARTICIPANT'] },
  },
  // Catchall
  { path: '/:catchAll(.*)*', component: () => import('@/pages/ErrorNotFound.vue') },
]

export default routes
