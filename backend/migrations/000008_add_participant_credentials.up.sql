-- Kredensial login peserta ujian (auto-generated)
CREATE TABLE IF NOT EXISTS participant_credentials (
    nisn            TEXT PRIMARY KEY,           -- kunci per-siswa (bukan per-exam)
    username        TEXT NOT NULL UNIQUE,       -- biasanya = nisn
    password_enc    BLOB NOT NULL,              -- AES-256-GCM ciphertext
    password_iv     BLOB NOT NULL,              -- nonce/IV
    is_active       INTEGER NOT NULL DEFAULT 1,
    valid_until     DATETIME NULL,              -- NULL = permanen; non-null = temporary card
    generated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    generated_by    TEXT
);

CREATE INDEX IF NOT EXISTS idx_participant_cred_username 
    ON participant_credentials(username);