// src/mocks/data/examdata.js
// Mock data dinormalisasi: setiap user punya { username, password } yang match
// dengan form login frontend. Field email/id tetap ada untuk backward-compat.

export const mockSuperAdminLogin = {
  token: 'mock_superadmin_token_' + Date.now(),
  role: 'SUPER_ADMIN',
  user: {
    username: 'superadmin',
    name: 'Super Administrator',
    role: 'SUPER_ADMIN',
  },
}

export const mockUsersByTenant = {
  smknkawali: {
    admins: [
      {
        username: 'admin',
        email: 'admin@smkn-kawali.com',
        password: 'admin123',
        name: 'Bu Dewi',
        role: 'ADMIN',
      },
    ],
    teachers: [
      {
        username: 'guru',
        email: 'guru@smkn-kawali.com',
        password: 'guru123',
        name: 'Pak Ahmad',
        role: 'PROCTOR',
      },
    ],
    participants: [
      {
        id: 'P001',
        username: 'P001', // pakai ID sebagai username
        password: 'pass123', // = exam_identifier
        exam_identifier: 'pass123',
        role: 'PARTICIPANT',
        user: { name: 'Budi Santoso', class: '12 IPA 1', nis: '12345' },
        token: 'mock_participant_token_' + Date.now(),
      },
      {
        id: 'P002',
        username: 'P002',
        password: 'pass456',
        exam_identifier: 'pass456',
        role: 'PARTICIPANT',
        user: { name: 'Siti Rahayu', class: '12 IPS 2', nis: '67890' },
        token: 'mock_participant_token_' + Date.now(),
      },
    ],
  },
  smkpasja: {
    admins: [
      {
        username: 'admin',
        email: 'admin@smkn-pasja.com',
        password: 'admin123',
        name: 'Bu Dewi',
        role: 'ADMIN',
      },
    ],
    teachers: [],
    participants: [
      {
        id: 'P101',
        username: 'P101',
        password: 'pass789',
        exam_identifier: 'pass789',
        role: 'PARTICIPANT',
        user: { name: 'Agus Wijaya', class: '11 RPL 1', nis: '11111' },
        token: 'mock_participant_token_' + Date.now(),
      },
    ],
  },
  sman1cirebon: {
    admins: [
      {
        username: 'admin',
        email: 'admin@smkn-pasja.com',
        password: 'admin123',
        name: 'Bu Nuri',
        role: 'ADMIN',
      },
    ],
    teachers: [],
    participants: [
      {
        id: 'P101',
        username: 'P101',
        password: 'pass789',
        exam_identifier: 'pass789',
        role: 'PARTICIPANT',
        user: { name: 'Agus Wijaya', class: '11 RPL 1', nis: '11111' },
        token: 'mock_participant_token_' + Date.now(),
      },
    ],
  },
  default: {
    admins: [],
    teachers: [],
    participants: [
      {
        id: 'default001',
        username: 'default001',
        password: 'default123',
        exam_identifier: 'default123',
        role: 'PARTICIPANT',
        user: { name: 'User Default', class: 'X', nis: '00000' },
        token: 'mock_participant_token_' + Date.now(),
      },
    ],
  },
}

// ── Sisanya TIDAK diubah (exam packages, telemetry, dsb.)

export const mockExamStart = {
  status: 'exam_started',
  duration_seconds: 1800,
  exam_name: 'Ujian Matematika & Bahasa - Semester Ganjil',
  questions: [
    {
      id: 'q1',
      question_type: 'PG',
      question_text: 'Berapakah hasil dari $15 \\times 8 + 20$?',
      options: JSON.stringify({ A: '100', B: '120', C: '140', D: '160' }),
      score: 10,
      media_url: null,
    },
    {
      id: 'q2',
      question_type: 'PG',
      question_text: 'Selesaikan persamaan kuadrat: $x^2 - 5x + 6 = 0$.',
      options: JSON.stringify({ A: 'x=1/6', B: 'x=2/3', C: 'x=-2/-3', D: 'x=0/5' }),
      score: 10,
      media_url: null,
    },
    {
      id: 'q3',
      question_type: 'PG',
      question_text: 'Hasil integral $\\int_{0}^{1} 2x \\, dx = \\ldots$',
      options: JSON.stringify({ A: '0', B: '1', C: '2', D: '4' }),
      score: 10,
      media_url: null,
    },
    {
      id: 'q4',
      question_type: 'ESSAY',
      question_text: 'Jelaskan langkah penyelesaian $2x + 5 = 15$.',
      options: '{}',
      score: 20,
      media_url: null,
      rubric: 'Langkah 1: Pindah konstan, Langkah 2: Bagi koefisien',
    },
    {
      id: 'q5',
      question_type: 'PG',
      question_text:
        '<div class="text-arabic">أنا أقرأ <b>كتاب</b></div>Arti kata <b>كتاب</b> adalah...',
      options: JSON.stringify({ A: 'Pensil', B: 'Buku/Kitab', C: 'Meja', D: 'Kursi' }),
      score: 10,
      media_url: null,
    },
    {
      id: 'q6',
      question_type: 'PG',
      question_text: '<span class="text-sundanese">ᮃᮊ᮪ᮞᮛ ᮞᮥᮔ᮪ᮓ</span> - Terjemahkan!',
      options: JSON.stringify({
        A: 'Aksara Jawa',
        B: 'Aksara Sunda',
        C: 'Aksara Bali',
        D: 'Aksara Latin',
      }),
      score: 10,
      media_url: null,
    },
    {
      id: 'q7',
      question_type: 'AUDIO',
      question_text: 'Dengarkan dialog: <b>Apa yang dibeli Ani?</b>',
      options: JSON.stringify({
        A: 'Roti dan susu',
        B: 'Nasi dan lauk',
        C: 'Buku dan pensil',
        D: 'Buah dan sayur',
        audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      }),
      score: 10,
      media_url: null,
    },
    {
      id: 'q8',
      question_type: 'PG',
      question_text: 'Determinan matriks $$A = \\begin{bmatrix} 2 & 3 \\\\ 1 & 4 \\end{bmatrix}$$',
      options: JSON.stringify({ A: '2', B: '5', C: '8', D: '10' }),
      score: 10,
      media_url: null,
    },
  ],
}

export const mockAnswerSave = { status: 'answer_saved' }
export const mockHeartbeat = { status: 'alive' }

export const mockTelemetry = (eventType) => {
  const responses = {
    TAB_SWITCH: { action: 'WARN', reason: 'Jangan meninggalkan tab ujian!' },
    WINDOW_BLUR: { action: 'WARN', reason: 'Window kehilangan fokus!' },
    FULLSCREEN_EXIT: { action: 'WARN', reason: 'Jangan keluar dari mode fullscreen!' },
    COPY_PASTE: { action: 'WARN', reason: 'Copy-paste tidak diperbolehkan!' },
    DEVTOOLS_ATTEMPT: { action: 'WARN', reason: 'Membuka DevTools tidak diperbolehkan!' },
    PRINT_SCREEN: { action: 'WARN', reason: 'Screenshot tidak diperbolehkan!' },
  }
  const response = responses[eventType] || { action: 'WARN', reason: 'Pelanggaran terdeteksi' }
  return { status: 'processed', ...response }
}

export const mockSubmit = { status: 'exam_completed', total_questions: 8, final_score: 70.0 }

export const mockExams = [
  {
    id: 'exam-001',
    subject: 'Matematika',
    teacher: 'Pak Budi',
    duration: 90,
    startTime: '08:00',
    endTime: '09:30',
    status: 'ready',
    tenant: 'smknkawali',
    participantId: 'P001',
    token: 'ABC123',
    completedAt: null,
  },
  {
    id: 'exam-002',
    subject: 'Fisika',
    teacher: 'Bu Siti',
    duration: 60,
    startTime: '10:00',
    endTime: '11:00',
    status: 'upcoming',
    tenant: 'smknkawali',
    participantId: 'P002',
    token: 'XYZ789',
    completedAt: null,
  },
  {
    id: 'exam-003',
    subject: 'Kimia',
    teacher: 'Pak Joko',
    duration: 45,
    startTime: '13:00',
    endTime: '13:45',
    status: 'completed',
    tenant: 'smknkawali',
    participantId: 'P001',
    token: 'DEF456',
    completedAt: '2025-01-15',
  },
]

export const mockHistory = [{ id: 'h1', subject: 'Fisika', completedAt: 'Kemarin, 15:30' }]
