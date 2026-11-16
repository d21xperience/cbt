-- BCR-3: Master Kelas / Rombel
CREATE TABLE IF NOT EXISTS classes (
    id            TEXT PRIMARY KEY,
    nama          TEXT NOT NULL,
    tingkat       INTEGER NOT NULL,
    jurusan_id    TEXT,
    wali_kelas_id TEXT,
    jumlah_siswa  INTEGER NOT NULL DEFAULT 0,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_classes_tingkat ON classes(tingkat);
