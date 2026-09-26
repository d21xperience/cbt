// src/mocks/data/examsData.js
// Mock Exams V2 — per kelas & mapel.

export const mockExamsFull = [
  {
    id: 'exam-001',
    nama: 'UAS Matematika X-TKJ',
    jenis_ujian_id: 'etype-002',
    jenis_ujian_kode: 'UAS',
    subject_id: 'sub-004', // MTK-10
    subject_kode: 'MTK',
    subject_nama: 'Matematika',
    class_id: 'cls-007', // X TKJ A
    class_nama: 'X TKJ A',
    tingkat: '10',
    jurusan_id: 'prog-tkj',
    jurusan_nama: 'TKJ',
    academic_year: '2025/2026',
    semester: 'GANJIL',
    total_questions: 10,
    status: 'DRAFT',
    created_at: '2026-09-25T08:00:00Z',
  },
  {
    id: 'exam-002',
    nama: 'UAS Bahasa Indonesia X',
    jenis_ujian_id: 'etype-002',
    jenis_ujian_kode: 'UAS',
    subject_id: 'sub-003', // BIN-10
    subject_kode: 'BIN',
    subject_nama: 'Bahasa Indonesia',
    class_id: 'cls-007',
    class_nama: 'X TKJ A',
    tingkat: '10',
    jurusan_id: null,
    jurusan_nama: null,
    academic_year: '2025/2026',
    semester: 'GANJIL',
    total_questions: 5,
    status: 'DRAFT',
    created_at: '2026-09-25T08:30:00Z',
  },
]

export const mockExams = mockExamsFull
