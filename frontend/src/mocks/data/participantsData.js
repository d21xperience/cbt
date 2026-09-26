// src/mocks/data/participantsData.js
//
// Mock data untuk Data Peserta — Phase 6 pending.
// BACKWARD-COMPAT: mempertahankan semua export lama + tambah export baru.

// ══════════════════════════════════════════════════════════════════
// PARTICIPANTS — shape merged (lama + baru)
// Field lama: id, participant_id, name, class, exam_id, exam_name,
//             semester_id, school_name, source, created_at
// Field baru: nisn, rombel, is_active
// ══════════════════════════════════════════════════════════════════
export const mockParticipants = [
  {
    id: 'p-001',
    participant_id: 'P001',
    nisn: '12345001',
    name: 'Ahmad Fauzi',
    class: '10 IPA 1',
    rombel: '10 IPA 1',
    exam_id: 'exam-001',
    exam_name: 'Ujian Matematika Kelas X',
    semester_id: '20251',
    school_name: 'SMK Pasundan Jatinangor',
    source: 'SIAKAD',
    is_active: true,
    created_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'p-002',
    participant_id: 'P002',
    nisn: '12345002',
    name: 'Siti Nurhaliza',
    class: '10 IPA 1',
    rombel: '10 IPA 1',
    exam_id: 'exam-001',
    exam_name: 'Ujian Matematika Kelas X',
    semester_id: '20251',
    school_name: 'SMK Pasundan Jatinangor',
    source: 'SIAKAD',
    is_active: true,
    created_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'p-003',
    participant_id: 'P003',
    nisn: '12345003',
    name: 'Budi Santoso',
    class: '10 IPA 2',
    rombel: '10 IPA 2',
    exam_id: 'exam-001',
    exam_name: 'Ujian Matematika Kelas X',
    semester_id: '20251',
    school_name: 'SMK Pasundan Jatinangor',
    source: 'SIAKAD',
    is_active: true,
    created_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'p-004',
    participant_id: 'EXT-001',
    nisn: '99000001',
    name: 'Dewi Lestari',
    class: '11 IPS 1',
    rombel: '11 IPS 1',
    exam_id: 'exam-002',
    exam_name: 'Ujian Bahasa Indonesia Kelas XI',
    semester_id: '20251',
    school_name: 'SMK Pasundan Jatinangor',
    source: 'EXTERNAL',
    is_active: true,
    created_at: '2026-09-15T00:00:00Z',
  },
  {
    id: 'p-005',
    participant_id: 'EXT-002',
    nisn: '99000002',
    name: 'Eka Pratama',
    class: '11 IPS 1',
    rombel: '11 IPS 1',
    exam_id: 'exam-002',
    exam_name: 'Ujian Bahasa Indonesia Kelas XI',
    semester_id: '20251',
    school_name: 'SMK Pasundan Jatinangor',
    source: 'EXTERNAL',
    is_active: true,
    created_at: '2026-09-15T00:00:00Z',
  },
  {
    id: 'p-006',
    participant_id: 'P006',
    nisn: '12345006',
    name: 'Fajar Nugroho',
    class: '12 IPA 1',
    rombel: '12 IPA 1',
    exam_id: 'exam-003',
    exam_name: 'Ujian Susulan Fisika',
    semester_id: '20251',
    school_name: 'SMK Pasundan Jatinangor',
    source: 'SIAKAD',
    is_active: true,
    created_at: '2026-09-01T00:00:00Z',
  },
]

// ══════════════════════════════════════════════════════════════════
// EXAMS — dropdown filter (BARU, dipakai Batch D)
// ══════════════════════════════════════════════════════════════════
export const mockExams = [
  { id: 'exam-001', name: 'Ujian Matematika Kelas X', subject: 'Matematika' },
  { id: 'exam-002', name: 'Ujian Bahasa Indonesia Kelas XI', subject: 'Bahasa Indonesia' },
  { id: 'exam-003', name: 'Ujian Susulan Fisika', subject: 'Fisika' },
]

// ══════════════════════════════════════════════════════════════════
// ARCHIVE — preserved untuk Archive.vue (Session 23)
// ══════════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════════
// USER DATA — preserved (dipakai stateStore.js → getUsers)
// Shape: { siswa: [], guru: [], admin: [] }
// ══════════════════════════════════════════════════════════════════
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
