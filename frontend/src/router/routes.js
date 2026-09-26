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
      {
        path: 'service-after-sales',
        name: 'super-service-after-sales',
        component: () => import('@/pages/super/ServiceAfterSales.vue'),
      },
      {
        path: 'infrastructure',
        name: 'super-infrastructure',
        component: () => import('@/pages/super/Infrastructure.vue'),
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
      {
        path: 'references/school',
        name: 'admin-school-profile',
        component: () => import('@/pages/admin/SchoolProfile.vue'),
      },
      {
        path: 'references/subjects',
        name: 'admin-subjects', // ← TAMBAH BARIS INI
        component: () => import('@/pages/admin/Subjects.vue'),
      },
      {
        path: 'references/classes',
        name: 'admin-classes',
        component: () => import('@/pages/admin/Classes.vue'),
      },
      {
        path: 'references/teachers',
        name: 'admin-teachers',
        component: () => import('@/pages/admin/Teachers.vue'),
      },
      {
        path: 'references/students',
        name: 'admin-students',
        component: () => import('@/pages/admin/Students.vue'),
      },
      {
        path: 'references/exam-types',
        name: 'admin-exam-types',
        component: () => import('@/pages/admin/ExamTypes.vue'),
      },
      {
        path: 'references/lessons',
        name: 'admin-lessons',
        component: () => import('@/pages/admin/Lessons.vue'),
      },
      {
        path: 'makeup',
        name: 'admin-makeup',
        component: () => import('@/pages/admin/MakeupExams.vue'),
        meta: { allowedRoles: ['ADMIN', 'SUPER_ADMIN'] },
      },
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
        meta: { allowedRoles: ['ADMIN', 'SUPER_ADMIN', 'PROCTOR', 'TEACHER'] },
      },
      {
        path: 'questions/edit/:examId',
        name: 'admin-question-editor',
        component: () => import('@/pages/admin/QuestionEditor.vue'),
        meta: { allowedRoles: ['ADMIN', 'SUPER_ADMIN', 'PROCTOR', 'TEACHER'] },
      },
      // {
      //   path: 'questions/preview/:examId',
      //   name: 'admin-question-preview',
      //   component: () => import('@/pages/admin/QuestionPreview.vue'),
      //   meta: { allowedRoles: ['ADMIN', 'SUPER_ADMIN', 'PROCTOR', 'TEACHER'] },
      // },
      {
        path: 'participants',
        name: 'admin-participants',
        component: () => import('@/pages/admin/Participants.vue'),
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
    meta: { requiresAuth: true, allowedRoles: ['PROCTOR', 'TEACHER', 'ADMIN'] },
    children: [
      {
        path: '',
        name: 'proctor-dashboard',
        component: () => import('@/pages/proctor/ProctorDashboard.vue'),
        // ── Batch C2: dashboard proctor HANYA untuk guru
        meta: { allowedRoles: ['PROCTOR', 'TEACHER'] },
      },
      {
        path: 'monitoring/:sessionId',
        name: 'proctor-monitoring',
        component: () => import('@/pages/proctor/ProctorMonitoring.vue'),
      },
      {
        path: 'unlock',
        name: 'proctor-unlock',
        component: () => import('@/pages/proctor/ProctorUnlock.vue'),
      },
      {
        path: 'tunggakan',
        name: 'proctor-tunggakan',
        component: () => import('@/pages/proctor/ProctorTunggakan.vue'),
        meta: {
          allowedRoles: ['ADMIN', 'SUPER_ADMIN', 'PROCTOR', 'TEACHER'],
          onlyHomeroomForRoles: ['PROCTOR', 'TEACHER'],
        },
      },
      {
        path: 'peserta-kelas',
        name: 'proctor-peserta-kelas',
        component: () => import('@/pages/proctor/ProctorPesertaKelas.vue'),
        meta: {
          allowedRoles: ['ADMIN', 'SUPER_ADMIN', 'PROCTOR', 'TEACHER'],
          onlyHomeroomForRoles: ['PROCTOR', 'TEACHER'],
        },
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
