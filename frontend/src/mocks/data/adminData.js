// src/mocks/adminData.js

export const mockDashboardStats = {
  totalParticipants: 245,
  totalExams: 8,
  activeSessions: 3,
  completedExams: 127,
}

export const mockSyncHistory = [
  {
    id: 1,
    timestamp: '2026-07-03T10:30:00Z',
    pembelajaran_id: 'pemb-001',
    semester_id: '20251',
    synced_count: 150,
    message: 'Sinkronisasi berhasil',
  },
  {
    id: 2,
    timestamp: '2026-07-02T08:15:00Z',
    pembelajaran_id: 'pemb-002',
    semester_id: '20251',
    synced_count: 85,
    message: 'Sinkronisasi berhasil',
  },
]

// 🔧 FIX: Ubah dari array langsung menjadi FACTORY FUNCTION
// Setiap kali dipanggil, return array BARU (deep clone)
export const getInitialSessions = () => [
  {
    id: 'sess-001',
    exam_id: 'exam-mtk-1',
    exam_name: 'Matematika Kelas X',
    session_type: 'REGULER',
    start_time: '2026-07-05T08:00:00Z',
    end_time: '2026-07-05T10:00:00Z',
    status: 'SCHEDULED',
    participant_count: 32
  },
  {
    id: 'sess-002',
    exam_id: 'exam-indo-1',
    exam_name: 'Bahasa Indonesia Kelas XI',
    session_type: 'REGULER',
    start_time: '2026-07-04T13:00:00Z',
    end_time: '2026-07-04T15:00:00Z',
    status: 'ACTIVE',
    participant_count: 28
  },
  {
    id: 'sess-003',
    exam_id: 'exam-mtk-1',
    exam_name: 'Matematika Kelas X',
    session_type: 'SUSULAN',
    start_time: '2026-07-06T08:00:00Z',
    end_time: '2026-07-06T10:00:00Z',
    status: 'SCHEDULED',
    participant_count: 5
  }
]
export const mockExams = [
  { id: 'exam-mtk-1', name: 'Matematika Kelas X', total_questions: 40 },
  { id: 'exam-indo-1', name: 'Bahasa Indonesia Kelas XI', total_questions: 35 },
  { id: 'exam-ipa-1', name: 'IPA Terpadu Kelas VIII', total_questions: 30 },
  { id: 'exam-ing-1', name: 'Bahasa Inggris Kelas IX', total_questions: 45 },
]

export const mockSyncResponse = (pembelajaranId, semesterId) => ({
  message: `Sinkronisasi dari SIAKAD berhasil untuk pembelajaran ${pembelajaranId} ${semesterId}`,
  synced_count: Math.floor(Math.random() * 100) + 50,
})
