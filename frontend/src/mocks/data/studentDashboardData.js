// src/mocks/data/studentDashboardData.js

export const mockStudent = {
  name: 'Budi Setiawan',
  nis: '202610043',
  class: 'XII MIPA 3',
  avatar: 'https://quasar.dev',
}

export const mockStudentExams = [
  {
    id: 'exam-01',
    subject: 'Matematika Peminatan',
    teacher: 'Drs. Hermawan',
    duration: 90,
    startTime: '08:00',
    endTime: '09:30',
    status: 'ready',
    requiresToken: true,
  },
  {
    id: 'exam-02',
    subject: 'Bahasa Inggris',
    teacher: 'Siti Rahma, M.Pd',
    duration: 60,
    startTime: '10:00',
    endTime: '11:00',
    status: 'upcoming',
    requiresToken: true,
  },
  {
    id: 'exam-03',
    subject: 'Fisika',
    teacher: 'Budi Utomo, S.Pd',
    duration: 90,
    startTime: 'Yesterday',
    endTime: 'Yesterday',
    status: 'completed',
    requiresToken: false,
  },
]
