CREATE TABLE IF NOT EXISTS exam_tokens (
    id           TEXT PRIMARY KEY,
    session_id   TEXT NOT NULL,
    token        TEXT NOT NULL,
    valid_from   DATETIME NOT NULL,
    valid_until  DATETIME NOT NULL,
    is_active    INTEGER NOT NULL DEFAULT 1,
    generated_by TEXT,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_exam_tokens_session ON exam_tokens(session_id);
CREATE INDEX idx_exam_tokens_active ON exam_tokens(session_id, is_active);