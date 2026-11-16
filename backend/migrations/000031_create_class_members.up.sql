-- FASE B: Separate Master vs Temporal
CREATE TABLE IF NOT EXISTS class_members (
    id             TEXT PRIMARY KEY,
    siswa_id       TEXT NOT NULL,
    class_id       TEXT NOT NULL,
    academic_year  TEXT NOT NULL,
    semester       TEXT NOT NULL,
    is_active      INTEGER NOT NULL DEFAULT 1,
    moved_at       DATETIME,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cm_siswa ON class_members(siswa_id);
CREATE INDEX IF NOT EXISTS idx_cm_class ON class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_cm_period ON class_members(academic_year, semester);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cm_active ON class_members(siswa_id, academic_year, semester) WHERE is_active = 1;

-- Backfill: semua siswa existing ke periode aktif
INSERT OR IGNORE INTO class_members (id, siswa_id, class_id, academic_year, semester, is_active)
SELECT 
    'cm-' || s.id || '-' || ap.academic_year || '-' || ap.semester,
    s.id,
    s.kelas_id,
    ap.academic_year,
    ap.semester,
    1
FROM siswa s
CROSS JOIN academic_periods ap
WHERE ap.is_active = 1;
