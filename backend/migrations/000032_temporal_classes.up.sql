-- FASE C.1: Classes Temporal
-- Tambah kolom periode ke classes
ALTER TABLE classes ADD COLUMN academic_year TEXT;
ALTER TABLE classes ADD COLUMN semester TEXT;

-- Backfill: semua kelas existing ke periode aktif
UPDATE classes SET 
    academic_year = (SELECT academic_year FROM academic_periods WHERE is_active = 1 LIMIT 1),
    semester = (SELECT semester FROM academic_periods WHERE is_active = 1 LIMIT 1)
WHERE academic_year IS NULL;

CREATE INDEX IF NOT EXISTS idx_classes_period ON classes(academic_year, semester);

-- Tabel audit rollover
CREATE TABLE IF NOT EXISTS rollover_logs (
    id              TEXT PRIMARY KEY,
    from_period     TEXT NOT NULL,
    to_period       TEXT NOT NULL,
    classes_copied  INTEGER NOT NULL DEFAULT 0,
    students_copied INTEGER NOT NULL DEFAULT 0,
    lessons_copied  INTEGER NOT NULL DEFAULT 0,
    graduates_count INTEGER NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
