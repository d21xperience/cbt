-- ============================================
-- BCR-1: Master Siswa (per-tenant DB, SQLite)
-- Source: Frontend mock F0.5a-2 / F1a-1
-- ============================================
-- Catatan:
--   - Tidak ada tenant_id (SQLite per tenant)
--   - exam_password TIDAK disimpan di sini
--     → pakai participant_credentials (AES-256-GCM)
--   - kelas_id = soft-ref (FK real setelah BCR-3)
--   - photo_url wajib untuk kartu ujian cetak
-- ============================================

CREATE TABLE IF NOT EXISTS siswa (
    id            TEXT PRIMARY KEY,
    nis           TEXT NOT NULL UNIQUE,
    nisn          TEXT UNIQUE,
    nama          TEXT NOT NULL,
    jenis_kelamin TEXT NOT NULL DEFAULT 'L',
    tanggal_lahir TEXT,
    kelas_id      TEXT NOT NULL,
    kelas_nama    TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'AKTIF',
    photo_url     TEXT,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_siswa_nis    ON siswa(nis);
CREATE INDEX IF NOT EXISTS idx_siswa_nisn   ON siswa(nisn);
CREATE INDEX IF NOT EXISTS idx_siswa_kelas  ON siswa(kelas_id);
CREATE INDEX IF NOT EXISTS idx_siswa_status ON siswa(status);