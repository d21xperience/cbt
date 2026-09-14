// src/mocks/data/scheduleData.js

// Data jurusan untuk SMK
export const jurusanOptions = [
  { label: 'Semua Jurusan (Umum)', value: 'UMUM' },
  { label: 'Teknik Jaringan Komputer & Telekomunikasi (TJKT)', value: 'TJKT' },
  { label: 'Akuntansi & Keuangan Lembaga (AKL)', value: 'AKL' },
  { label: 'Desain Komunikasi Visual (DKV)', value: 'DKV' },
]

// Data mata pelajaran untuk input massal
export const mockAllSubjectsForm = [
  { subject_id: 'sub-mat', subject_name: 'Matematika', date: '', start_time: '', duration: 90 },
  {
    subject_id: 'sub-indo',
    subject_name: 'Bahasa Indonesia',
    date: '',
    start_time: '',
    duration: 90,
  },
  {
    subject_id: 'sub-pbas',
    subject_name: 'Pemrograman Dasar',
    date: '',
    start_time: '',
    duration: 120,
  },
]

// Daftar jadwal awal (bisa diisi ulang)
export const getInitialSchedules = () => [
  {
    id: 'sch-101',
    subject_id: 'aij',
    subject_name: 'Administrasi Infrastruktur Jaringan',
    exam_date: '2026-06-15',
    start_time: '07:30',
    duration: 90,
    token: 'AIJXYZ',
    target_jurusan: 'TJKT',
    target_kelas: 'XI TJKT 1',
    shuffle_questions: true,
    shuffle_options: true,
  },
]
