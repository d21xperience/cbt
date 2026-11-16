-- BCR-3.1: Teachers & Rooms
CREATE TABLE IF NOT EXISTS teachers (
    id            TEXT PRIMARY KEY,
    nama          TEXT NOT NULL,
    nip           TEXT,
    jenis_kelamin TEXT DEFAULT 'L',
    status        TEXT NOT NULL DEFAULT 'AKTIF',
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
    id            TEXT PRIMARY KEY,
    nama          TEXT NOT NULL,
    kapasitas     INTEGER DEFAULT 0,
    lokasi        TEXT,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Update tabel classes untuk mendukung relasi Ruang & Wali Kelas
ALTER TABLE classes ADD COLUMN ruang_id TEXT;
ALTER TABLE classes ADD COLUMN ruang_nama TEXT;
ALTER TABLE classes ADD COLUMN wali_kelas_nama TEXT;
