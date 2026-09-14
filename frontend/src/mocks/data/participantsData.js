// src/mocks/participantsData.js

export const mockParticipants = [
  {
    id: 'pd-001',
    participant_id: '0012345678',
    name: 'Budi Santoso',
    class: 'X IPA 1',
    exam_id: 'exam-mtk-1',
    exam_name: 'Matematika Kelas X',
    semester_id: '20251',
    school_name: 'SMA Negeri 1 Jakarta',
    source: 'SIAKAD',
    created_at: '2026-07-01T08:00:00Z',
  },
  {
    id: 'pd-002',
    participant_id: '0012345679',
    name: 'Siti Aminah',
    class: 'X IPA 1',
    exam_id: 'exam-mtk-1',
    exam_name: 'Matematika Kelas X',
    semester_id: '20251',
    school_name: 'SMA Negeri 1 Jakarta',
    source: 'SIAKAD',
    created_at: '2026-07-01T08:00:00Z',
  },
  {
    id: 'pd-003',
    participant_id: 'EXT-001',
    name: 'Ahmad Fauzi',
    class: 'X IPA 2',
    exam_id: 'exam-mtk-1',
    exam_name: 'Matematika Kelas X',
    semester_id: '20251',
    school_name: 'SMA Swasta Cendekia',
    source: 'EXTERNAL',
    created_at: '2026-07-02T10:30:00Z',
  },
  {
    id: 'pd-004',
    participant_id: '0012345680',
    name: 'Dewi Lestari',
    class: 'XI IPA 1',
    exam_id: 'exam-indo-1',
    exam_name: 'Bahasa Indonesia Kelas XI',
    semester_id: '20251',
    school_name: 'SMA Negeri 1 Jakarta',
    source: 'SIAKAD',
    created_at: '2026-07-01T08:00:00Z',
  },
]

export const mockArchiveHistory = [
  {
    id: 1,
    timestamp: '2026-01-15T14:30:00Z',
    school_id: 'school-001',
    school_name: 'SMA Negeri 1 Jakarta',
    semester_id: '20242',
    is_end_of_academic_year: true,
    archived_participants: 245,
    archived_exams: 8,
    archived_sessions: 16,
    performed_by: 'admin',
  },
  {
    id: 2,
    timestamp: '2025-07-20T09:15:00Z',
    school_id: 'school-001',
    school_name: 'SMA Negeri 1 Jakarta',
    semester_id: '20241',
    is_end_of_academic_year: false,
    archived_participants: 180,
    archived_exams: 6,
    archived_sessions: 12,
    performed_by: 'admin',
  },
]

export const mockImportPreview = (rows) => {
  return rows.map((row, idx) => ({
    _rowNumber: idx + 1,
    participant_id: row.participant_id || row.nisn || '',
    name: row.name || '',
    class: row.class || row.kelas || '',
    _error:
      !row.participant_id && !row.nisn ? 'ID Peserta kosong' : !row.name ? 'Nama kosong' : null,
  }))
}

export const mockArchiveResponse = (isEndOfYear) => ({
  message: isEndOfYear
    ? 'Archive akhir tahun ajaran berhasil. Sistem telah di-reset untuk semester baru.'
    : 'Archive semester berhasil. Data telah dipindahkan ke storage arsip.',
  archived_participants: Math.floor(Math.random() * 100) + 100,
  archived_exams: Math.floor(Math.random() * 5) + 3,
  archived_sessions: Math.floor(Math.random() * 10) + 5,
})


// Data dummy untuk simulasi
export const mockUserData = {
  siswa: [
    {
      id: 1,
      nama: 'Ahmad Faizal',
      email: 'ahmad@example.com',
      username: 'ahmad',
      role: 'siswa',
      kelas: '12 IPA 1',
      nis: '12345',
    },
    {
      id: 2,
      nama: 'Siti Nurhaliza',
      email: 'siti@example.com',
      username: 'siti',
      role: 'siswa',
      kelas: '11 IPS 2',
      nis: '12346',
    },
  ],
  guru: [
    {
      id: 3,
      nama: 'Budi Santoso',
      email: 'budi@example.com',
      username: 'budi',
      role: 'guru',
      nip: '98765',
      mataPelajaran: ['Matematika', 'Fisika'],
    },
    {
      id: 4,
      nama: 'Dewi Lestari',
      email: 'dewi@example.com',
      username: 'dewi',
      role: 'guru',
      nip: '98766',
      mataPelajaran: ['Bahasa Inggris'],
    },
  ],
  admin: [
    {
      id: 5,
      nama: 'Admin Utama',
      email: 'admin@example.com',
      username: 'admin',
      role: 'admin',
      level: 'super',
    },
  ],
}
