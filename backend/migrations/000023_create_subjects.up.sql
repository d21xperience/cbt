CREATE TABLE IF NOT EXISTS subjects (
    id            TEXT PRIMARY KEY,
    kode          TEXT NOT NULL,
    nama          TEXT NOT NULL,
    nama_singkat  TEXT NOT NULL,
    kelompok      TEXT NOT NULL,
    tingkat       TEXT NOT NULL,
    jurusan_id    TEXT,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_kode ON subjects(kode);
