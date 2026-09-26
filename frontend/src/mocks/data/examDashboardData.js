// src/mocks/data/examDashboardData.js
// Mock untuk dashboard peserta (/exam/dashboard).
// Schema VER-003: 3 section (scheduled, makeup_available, completed).

export const mockExamDashboard = {
  status: 'ok',
  data: {
    scheduled: [
      {
        id: 'exam-001',
        name: 'Ujian Matematika Kelas X',
        subject: 'Matematika',
        date: '2026-09-25T08:00:00Z',
        duration: 90,
        status: 'ready',
        hasCache: false,
      },
    ],
    makeup_available: [],
    completed: [
      {
        id: 'exam-002',
        name: 'Ujian Bahasa Indonesia Kelas X',
        subject: 'Bahasa Indonesia',
        date: '2026-09-15T08:00:00Z',
        duration: 60,
        status: 'completed',
        completed_at: '2026-09-15T09:00:00Z',
        score: 85,
      },
    ],
  },
}
