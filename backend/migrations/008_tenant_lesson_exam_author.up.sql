-- Add is_exam_author column to lessons
ALTER TABLE lessons ADD COLUMN is_exam_author INTEGER NOT NULL DEFAULT 0;

-- Seed data: Tunjuk 1 baris acak sebagai Penyusun Soal (untuk testing)
UPDATE lessons SET is_exam_author = 1 WHERE id = (SELECT id FROM lessons LIMIT 1);
