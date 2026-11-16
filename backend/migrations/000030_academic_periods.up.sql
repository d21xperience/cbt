-- 1. Tabel Master Periode (Jantung Data)
CREATE TABLE IF NOT EXISTS academic_periods (
    id              TEXT PRIMARY KEY,
    academic_year   TEXT NOT NULL,
    semester        TEXT NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(academic_year, semester)
);

-- Seed periode default (aktif)
INSERT OR IGNORE INTO academic_periods (id, academic_year, semester, is_active) 
VALUES ('period-2025-ganjil', '2025/2026', 'GANJIL', 1);

-- 2. Tambah kolom eksplisit di exam_schedules
ALTER TABLE exam_schedules ADD COLUMN academic_year TEXT;
ALTER TABLE exam_schedules ADD COLUMN semester TEXT;

-- 3. Backfill data lama (dari tabel lessons)
UPDATE exam_schedules 
SET academic_year = (SELECT academic_year FROM lessons WHERE lessons.id = exam_schedules.lesson_id),
    semester = (SELECT semester FROM lessons WHERE lessons.id = exam_schedules.lesson_id)
WHERE academic_year IS NULL;
