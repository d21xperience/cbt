// src/mocks/data/examdata.js (UPDATE)

export const mockSuperAdminLogin = {
  token: 'mock_superadmin_token_' + Date.now(),
  role: 'SUPER_ADMIN',
}

// 🔥 Data dummy khusus tenant (pisahkan berdasarkan slug)
export const mockUsersByTenant = {
  smknkawali: {
    participants: [
      {
        id: 'P001',
        user: {
          name: 'Budi Santoso',
          class: '12 IPA 1',
          nis: '12345',
        },
        exam_identifier: 'pass123',
        role: 'PARTICIPANT',
        token: 'mock_participant_token_' + Date.now(),
      },
      {
        id: 'P002',
        user: { name: 'Siti Rahayu', class: '12 IPS 2', nis: '67890' },
        exam_identifier: 'pass456',
        role: 'PARTICIPANT',
        token: 'mock_participant_token_' + Date.now(),
      },
    ],
    teachers: [{ email: 'guru@smkn-kawali.com', password: 'guru123', name: 'Pak Ahmad' }],
    admins: [{ email: 'admin@smkn-kawali.com', password: 'admin123', name: 'Bu Dewi' }],
  },
  smkpasja: {
    participants: [
      {
        id: 'P101',
        user: {
          name: 'Agus Wijaya',
          class: '11 RPL 1',
          nis: '11111',
          exam_identifier: 'pass789',
        },
      },
    ],
    teachers: [],
    admins: [{ email: 'admin@smkn-pasja.com', password: 'admin123', name: 'Bu Dewi' }],
  },
  default: {
    // Fallback jika tidak ada tenant
    participants: [
      {
        id: 'default001',
        name: 'User Default',
        class: 'X',
        nis: '00000',
        exam_identifier: 'default123',
      },
    ],
    teachers: [],
    admins: [],
  },
}

export const mockExamStart = {
  status: 'exam_started',
  duration_seconds: 1800,
  exam_name: 'Ujian Matematika & Bahasa - Semester Ganjil',
  questions: [
    // SOAL 1: PG dengan LaTeX inline
    {
      id: 'q1',
      question_type: 'PG',
      question_text: 'Berapakah hasil dari $15 \\times 8 + 20$?',
      options: JSON.stringify({
        A: '100',
        B: '120',
        C: '140',
        D: '160',
      }),
      score: 10,
      media_url: null,
    },
    // SOAL 2: PG dengan LaTeX display mode
    {
      id: 'q2',
      question_type: 'PG',
      question_text:
        'Selesaikan persamaan kuadrat berikut: $x^2 - 5x + 6 = 0$. Nilai $x$ yang memenuhi adalah...',
      options: JSON.stringify({
        A: 'x = 1 atau x = 6',
        B: 'x = 2 atau x = 3',
        C: 'x = -2 atau x = -3',
        D: 'x = 0 atau x = 5',
      }),
      score: 10,
      media_url: null,
    },
    // SOAL 3: PG Integral
    {
      id: 'q3',
      question_type: 'PG',
      question_text: 'Hasil dari integral berikut adalah: $\\int_{0}^{1} 2x \\, dx = \\ldots$',
      options: JSON.stringify({
        A: '0',
        B: '1',
        C: '2',
        D: '4',
      }),
      score: 10,
      media_url: null,
    },
    // SOAL 4: ESSAY
    {
      id: 'q4',
      question_type: 'ESSAY',
      question_text:
        'Jelaskan langkah-langkah menyelesaikan persamaan linear satu variabel $2x + 5 = 15$ secara sistematis!',
      options: '{}',
      score: 20,
      media_url: null,
      rubric: 'Langkah 1: Pindah konstan, Langkah 2: Bagi koefisien',
    },
    // SOAL 5: PG Bahasa Arab
    {
      id: 'q5',
      question_type: 'PG',
      question_text:
        '<div class="text-arabic">أنا أقرأ <b>كتاب</b></div><br>Arti dari kata <b>كتاب</b> (kitab) adalah...',
      options: JSON.stringify({
        A: 'Pensil',
        B: 'Buku/Kitab',
        C: 'Meja',
        D: 'Kursi',
      }),
      score: 10,
      media_url: null,
    },
    // SOAL 6: PG Aksara Sunda (placeholder)
    {
      id: 'q6',
      question_type: 'PG',
      question_text:
        '<span class="text-sundanese">ᮃᮊ᮪ᮞᮛ ᮞᮥᮔ᮪ᮓ</span> (Aksara Sunda) - Terjemahkan kata tersebut!',
      options: JSON.stringify({
        A: 'Aksara Jawa',
        B: 'Aksara Sunda',
        C: 'Aksara Bali',
        D: 'Aksara Latin',
      }),
      score: 10,
      media_url: null,
    },
    // SOAL 7: AUDIO
    {
      id: 'q7',
      question_type: 'AUDIO',
      question_text:
        'Dengarkan dialog berikut, lalu jawab pertanyaan: <b>Apa yang dibeli oleh Ani?</b>',
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
    // SOAL 8: PG Matriks (LaTeX kompleks)
    {
      id: 'q8',
      question_type: 'PG',
      question_text:
        'Tentukan determinan dari matriks berikut: $$A = \\begin{bmatrix} 2 & 3 \\\\ 1 & 4 \\end{bmatrix}$$',
      options: JSON.stringify({
        A: '2',
        B: '5',
        C: '8',
        D: '10',
      }),
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

export const mockSubmit = {
  status: 'exam_completed',
  total_questions: 8,
  final_score: 70.0,
}

export const mockExams = [
  {
    id: 'exam-001',
    subject: 'Matematika',
    teacher: 'Pak Budi',
    duration: 90,
    startTime: '08:00',
    endTime: '09:30',
    status: 'ready', // ready, upcoming, completed
    tenant: 'smknkawali',
    participantId: 'P001', // <- Milik Budi Santoso
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
    participantId: 'P002', // <- Milik Siti Rahayu
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
    tenant: 'smkn-kawali',
    participantId: 'P001',
    token: 'DEF456',
    completedAt: '2025-01-15',
  },
]

export const mockHistory = [
  {
    id: 'h1',
    subject: 'Fisika',
    completedAt: 'Kemarin, 15:30',
  },
]
