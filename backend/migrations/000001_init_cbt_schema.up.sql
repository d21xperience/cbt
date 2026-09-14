-- 1. TABEL JADWAL/SESI UJIAN AKTIF
-- Pada SQLite3, tipe TEXT digunakan untuk menggantikan UUID, dan AUTOINCREMENT memakai INTEGER PRIMARY KEY
CREATE TABLE exams (
    id TEXT PRIMARY KEY, -- Kita akan meng-generate UUID murni dari kode Golang, bukan dari DB
    title TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    start_time TEXT NOT NULL, -- SQLite tidak memiliki tipe DATE/TIMESTAMP khusus, gunakan string TEXT ISO8601
    end_time TEXT NOT NULL
);

-- migrations/000001_init_cbt_schema.up.sql

-- Tabel untuk menyimpan bank soal
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL,
    question_text TEXT NOT NULL,
    media_url TEXT, -- URL absolut ke CDN/Object Storage
    correct_option TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel untuk menyimpan hasil akhir ujian (disinkronkan dari Redis)
CREATE TABLE IF NOT EXISTS exam_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id TEXT NOT NULL,
    exam_id TEXT NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    final_score REAL NOT NULL,
    status TEXT DEFAULT 'SUBMITTED',
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(participant_id, exam_id)
);

-- Index untuk mempercepat query
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_participant ON exam_results(participant_id);

-- Tabel untuk menampung data hasil sinkronisasi dari SIAKAD (Dapodik)
CREATE TABLE IF NOT EXISTS eligible_participants (
    participant_id TEXT PRIMARY KEY, -- UUID peserta_didik dari Dapodik
    nisn TEXT NOT NULL,
    name TEXT NOT NULL,
    rombel_name TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    pembelajaran_id TEXT NOT NULL, -- UUID dari tabel pembelajaran
    semester_id TEXT NOT NULL,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_eligible_nisn ON eligible_participants(nisn);
CREATE INDEX IF NOT EXISTS idx_eligible_pembelajaran ON eligible_participants(pembelajaran_id);