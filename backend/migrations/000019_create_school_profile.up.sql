-- ============================================
-- BCR-2: School Profile Extension (per-tenant DB, SQLite)
-- Source: Frontend mock src/mocks/handlers/schoolProfileHandlers.js
-- ============================================
-- Catatan:
--   - Identity (nama_sekolah, npsn, jenjang) TETAP di platform.db tenants
--   - Tabel ini hanya menyimpan EXTENSION fields editable oleh admin tenant
--   - 1 row per tenant (id = 'singleton')
--   - logo_url = data URL base64 (max 2 MB string length, validasi di usecase)
-- ============================================

CREATE TABLE IF NOT EXISTS school_profile (
    id                  TEXT PRIMARY KEY DEFAULT 'singleton',
    nss                 TEXT NOT NULL DEFAULT '',
    kode_sekolah        TEXT NOT NULL DEFAULT '',
    alamat_jalan        TEXT NOT NULL DEFAULT '',
    alamat_desa         TEXT NOT NULL DEFAULT '',
    alamat_kecamatan    TEXT NOT NULL DEFAULT '',
    alamat_kabupaten    TEXT NOT NULL DEFAULT '',
    alamat_provinsi     TEXT NOT NULL DEFAULT '',
    alamat_kode_pos     TEXT NOT NULL DEFAULT '',
    telp                TEXT NOT NULL DEFAULT '',
    email               TEXT NOT NULL DEFAULT '',
    website             TEXT NOT NULL DEFAULT '',
    kepala_sekolah_nama TEXT NOT NULL DEFAULT '',
    kepala_sekolah_nip  TEXT NOT NULL DEFAULT '',
    logo_url            TEXT NOT NULL DEFAULT '',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed singleton (idempotent)
INSERT OR IGNORE INTO school_profile (id) VALUES ('singleton');
