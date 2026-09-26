// src/mocks/data/proctorData.js
// Mock data untuk Proctor Dashboard — VER-003 verified.

export const mockProctorSessions = [
  {
    session_id: 'sess-001',
    exam_title: 'Ujian Matematika Kelas X',
    session_type: 'REGULER',
    start_time: '2026-09-22T08:00:00Z',
    end_time: '2026-09-22T09:30:00Z',
    status: 'ACTIVE',
    student_count: 32,
  },
  {
    session_id: 'sess-002',
    exam_title: 'Ujian Bahasa Indonesia Kelas XI',
    session_type: 'REGULER',
    start_time: '2026-09-22T10:00:00Z',
    end_time: '2026-09-22T11:00:00Z',
    status: 'SCHEDULED',
    student_count: 28,
  },
  {
    session_id: 'sess-003',
    exam_title: 'Ujian Susulan Fisika',
    session_type: 'SUSULAN',
    start_time: '2026-09-21T13:00:00Z',
    end_time: '2026-09-21T14:30:00Z',
    status: 'CLOSED',
    student_count: 5,
  },
  {
    // ← BARU: variety
    session_id: 'sess-004',
    exam_title: 'Ujian Matematika Kelas XI IPA 2',
    session_type: 'REGULER',
    start_time: '2026-09-23T08:00:00Z',
    end_time: '2026-09-23T09:30:00Z',
    status: 'ACTIVE',
    student_count: 30,
  },
]
