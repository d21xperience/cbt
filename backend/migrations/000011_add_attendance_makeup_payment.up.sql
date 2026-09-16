-- Attendance tracking
ALTER TABLE participant_sessions ADD COLUMN attendance_status TEXT DEFAULT 'PENDING';
-- PENDING | PRESENT | ABSENT | EXCUSED

-- Makeup tracking
ALTER TABLE participant_sessions ADD COLUMN is_makeup INTEGER DEFAULT 0;
ALTER TABLE participant_sessions ADD COLUMN makeup_reason TEXT;
ALTER TABLE participant_sessions ADD COLUMN makeup_approved_by TEXT;
ALTER TABLE participant_sessions ADD COLUMN makeup_approved_at DATETIME;

CREATE INDEX IF NOT EXISTS idx_ps_attendance ON participant_sessions(attendance_status);
CREATE INDEX IF NOT EXISTS idx_ps_is_makeup ON participant_sessions(is_makeup) WHERE is_makeup = 1;

-- Payment gate (per siswa, keyed by NISN)
CREATE TABLE IF NOT EXISTS payment_gates (
    nisn            TEXT PRIMARY KEY,
    is_blocked      INTEGER NOT NULL DEFAULT 0,
    reason          TEXT,
    source          TEXT DEFAULT 'MANUAL',   -- MANUAL | SIAKAD
    blocked_by      TEXT,
    blocked_at      DATETIME,
    unblocked_by    TEXT,
    unblocked_at    DATETIME,
    note            TEXT
);
CREATE INDEX IF NOT EXISTS idx_payment_gates_blocked ON payment_gates(is_blocked) WHERE is_blocked = 1;