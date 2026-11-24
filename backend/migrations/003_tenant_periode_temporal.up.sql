
-- ----- CLASS MEMBERS (031 + 034) -----
CREATE TABLE IF NOT EXISTS class_members (
    id                  TEXT PRIMARY KEY,
    siswa_id            TEXT NOT NULL,
    class_id            TEXT NOT NULL,
    -- academic_year       TEXT NOT NULL,
    -- semester            TEXT NOT NULL,
    academic_period_id  TEXT REFERENCES academic_periods(id),
    is_active           INTEGER NOT NULL DEFAULT 1,
    moved_at            DATETIME,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cm_siswa       ON class_members(siswa_id);
CREATE INDEX IF NOT EXISTS idx_cm_class       ON class_members(class_id);
-- CREATE INDEX IF NOT EXISTS idx_cm_period      ON class_members(academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_cm_period_fk   ON class_members(academic_period_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cm_active
    ON class_members(siswa_id, academic_period_id) WHERE is_active = 1;

-- ----- ROLLOVER LOGS (032) -----
CREATE TABLE IF NOT EXISTS rollover_logs (
    id               TEXT PRIMARY KEY,
    from_period      TEXT NOT NULL,
    to_period        TEXT NOT NULL,
    classes_copied   INTEGER NOT NULL DEFAULT 0,
    students_copied  INTEGER NOT NULL DEFAULT 0,
    lessons_copied   INTEGER NOT NULL DEFAULT 0,
    graduates_count  INTEGER NOT NULL DEFAULT 0,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
