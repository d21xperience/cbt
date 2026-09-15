-- Fix: kolom `options` di questions untuk menyimpan pilihan jawaban sebagai JSON
ALTER TABLE questions ADD COLUMN options TEXT DEFAULT '{}';

-- Fix: kolom `status` di exam_sessions
ALTER TABLE exam_sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'SCHEDULED';