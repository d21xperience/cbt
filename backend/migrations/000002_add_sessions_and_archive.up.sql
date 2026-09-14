-- Tabel Sesi Ujian (Reguler / Susulan)
CREATE TABLE IF NOT EXISTS exam_sessions (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL,
    session_type TEXT NOT NULL, -- 'REGULER' atau 'SUSULAN'
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Mapping Peserta ke Sesi Ujian
CREATE TABLE IF NOT EXISTS participant_sessions (
    participant_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ELIGIBLE', -- ELIGIBLE, IN_PROGRESS, COMPLETED
    PRIMARY KEY(participant_id, session_id)
);

-- Update tabel exam_results untuk mencatat sesi
ALTER TABLE exam_results ADD COLUMN session_type TEXT DEFAULT 'REGULER';

CREATE INDEX IF NOT EXISTS idx_sessions_exam ON exam_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_part_sess_status ON participant_sessions(status);

-- Tambahkan semester_id pada exam_sessions untuk memudahkan cleanup per semester
ALTER TABLE exam_sessions ADD COLUMN semester_id CHAR(5) NOT NULL DEFAULT '00000';
CREATE INDEX IF NOT EXISTS idx_sessions_semester ON exam_sessions(semester_id);

-- Pastikan eligible_participants juga punya semester_id (sudah ada di desain sebelumnya, tapi dipertegas)
-- eligible_participants sudah memiliki semester_id