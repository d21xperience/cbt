-- ============================================
-- BASELINE 003 — PERIODE AKADEMIK & TEMPORAL
-- Menggabungkan: 030, 031, 032, 033, 034
-- ============================================

-- ============================================
-- BASELINE 002 — MASTER AKADEMIK (per-tenant DB)
-- Menggabungkan: 018, 019, 020, 021, 022, 023, 024, 025, 026, 027, 035, 036
-- ============================================

-- ----- ROOMS (021 + 024: lokasi di-rename ke gedung) -----
CREATE TABLE IF NOT EXISTS rooms (
    id         TEXT PRIMARY KEY,
    nama       TEXT NOT NULL,
    kapasitas  INTEGER DEFAULT 0,
    gedung     TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ----- CLASSES (020 + 021 + 022 + 032 + 034) -----
CREATE TABLE IF NOT EXISTS classes (
    id                  TEXT PRIMARY KEY,
    nama                TEXT NOT NULL,
    tingkat             INTEGER NOT NULL,
    jurusan_id          TEXT,
    wali_kelas_id       TEXT,
    wali_kelas_nama     TEXT,
    ruang_id            TEXT,
    ruang_nama          TEXT,
    jumlah_siswa        INTEGER NOT NULL DEFAULT 0,
    kurikulum           TEXT DEFAULT 'MERDEKA',
    jenis_rombel        TEXT DEFAULT 'REGULER',
    -- academic_year       TEXT,
    -- semester            TEXT,
    academic_period_id  TEXT REFERENCES academic_periods(id),
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_classes_tingkat     ON classes(tingkat);
CREATE INDEX IF NOT EXISTS idx_classes_period_fk   ON classes(academic_period_id);
-- CREATE INDEX IF NOT EXISTS idx_classes_period      ON classes(academic_year, semester);

-- ----- SUBJECTS (023) -----
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

-- ----- TEACHERS (021 + 024 + 025 + 035 + 036) -----
-- CATATAN: password_plain DIHAPUS permanen (036). Tidak dibuat di baseline.
CREATE TABLE IF NOT EXISTS teachers (
    id                   TEXT PRIMARY KEY,
    nama                 TEXT NOT NULL,
    nip                  TEXT,
    jenis_kelamin        TEXT DEFAULT 'L',
    status               TEXT NOT NULL DEFAULT 'AKTIF',
    username             TEXT DEFAULT '',
    homeroom_class_id    TEXT DEFAULT '',
    homeroom_class_nama  TEXT DEFAULT '',
    subject_id           TEXT DEFAULT '',
    email                TEXT DEFAULT '',
    password_hash        TEXT DEFAULT '',
    password_enc         BLOB,
    password_iv          BLOB,
    teaching_subject_ids TEXT DEFAULT '[]',
    is_homeroom          INTEGER DEFAULT 0,
    has_logged_in        INTEGER DEFAULT 0,
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----- SISWA (018) -----
CREATE TABLE IF NOT EXISTS siswa (
    id             TEXT PRIMARY KEY,
    nis            TEXT NOT NULL UNIQUE,
    nisn           TEXT UNIQUE,
    nama           TEXT NOT NULL,
    jenis_kelamin  TEXT NOT NULL DEFAULT 'L',
    tanggal_lahir  TEXT,
    -- kelas_id       TEXT NOT NULL,
    -- kelas_nama     TEXT NOT NULL,
    -- status         TEXT NOT NULL DEFAULT 'AKTIF',
    photo_url      TEXT,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_siswa_nis    ON siswa(nis);
CREATE INDEX IF NOT EXISTS idx_siswa_nisn   ON siswa(nisn);
-- CREATE INDEX IF NOT EXISTS idx_siswa_kelas  ON siswa(kelas_id);
-- CREATE INDEX IF NOT EXISTS idx_siswa_status ON siswa(status);

-- ----- LESSONS (027 + 034) -----
CREATE TABLE IF NOT EXISTS lessons (
    id                  TEXT PRIMARY KEY,
    subject_id          TEXT NOT NULL,
    class_id            TEXT NOT NULL,
    teacher_id          TEXT NOT NULL,
    academic_period_id  TEXT REFERENCES academic_periods(id),
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lessons_subject    ON lessons(subject_id);
CREATE INDEX IF NOT EXISTS idx_lessons_class      ON lessons(class_id);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher    ON lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_period_fk  ON lessons(academic_period_id);


-- ----- PROCTOR ASSIGNMENTS (010) -----
CREATE TABLE IF NOT EXISTS proctor_assignments (
    id           TEXT PRIMARY KEY,
    proctor_id   TEXT NOT NULL,
    session_id   TEXT NOT NULL,
    class_name   TEXT DEFAULT '',
    assigned_by  TEXT,
    assigned_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proctor_id, session_id, class_name)
);
CREATE INDEX IF NOT EXISTS idx_proctor_assign_session ON proctor_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_proctor_assign_proctor ON proctor_assignments(proctor_id);


-- ----- PARTICIPANT CREDENTIALS (008 + 012 + 040) -----
CREATE TABLE IF NOT EXISTS participant_credentials (
    nisn                TEXT PRIMARY KEY,
    username            TEXT NOT NULL UNIQUE,
    password_enc        BLOB NOT NULL,
    password_iv         BLOB NOT NULL,
    is_active           INTEGER NOT NULL DEFAULT 1,
    valid_until         DATETIME NULL,
    qr_token            TEXT,
    device_fingerprint  TEXT,
    is_revoked          INTEGER DEFAULT 0,
    tenant_id           TEXT NOT NULL,
    generated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    generated_by        TEXT
);
CREATE INDEX IF NOT EXISTS idx_participant_cred_username ON participant_credentials(username);
CREATE INDEX IF NOT EXISTS idx_cred_tenant               ON participant_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cred_tenant_username      ON participant_credentials(tenant_id, username);
CREATE INDEX IF NOT EXISTS idx_cred_qr_token             ON participant_credentials(qr_token);
CREATE INDEX IF NOT EXISTS idx_cred_revoked              ON participant_credentials(is_revoked);
