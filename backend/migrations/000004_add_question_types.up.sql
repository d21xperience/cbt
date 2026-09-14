-- Tambahkan kolom tipe soal
ALTER TABLE questions ADD COLUMN question_type TEXT DEFAULT 'PG';
ALTER TABLE questions ADD COLUMN score REAL DEFAULT 10;
ALTER TABLE questions ADD COLUMN rubric TEXT;

-- Ubah kolom options menjadi lebih fleksibel (masih JSON string)
-- Tidak perlu alter karena kolom options sudah TEXT

CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);