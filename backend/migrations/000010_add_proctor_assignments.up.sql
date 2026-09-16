-- Penugasan proctor (guru) ke sesi ujian
CREATE TABLE IF NOT EXISTS proctor_assignments (
    id           TEXT PRIMARY KEY,
    proctor_id   TEXT NOT NULL,           -- FK ke admins.id (role=PROCTOR)
    session_id   TEXT NOT NULL,           -- FK ke exam_sessions.id
    class_name   TEXT DEFAULT '',         -- opsional: XII-1, XII-2
    assigned_by  TEXT,
    assigned_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proctor_id, session_id, class_name)
);
CREATE INDEX IF NOT EXISTS idx_proctor_assign_session
    ON proctor_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_proctor_assign_proctor
    ON proctor_assignments(proctor_id);