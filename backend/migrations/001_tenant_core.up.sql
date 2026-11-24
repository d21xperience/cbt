-- ----- ACADEMIC PERIODS (030 + 033: ID format YYYY[1|2]) -----
CREATE TABLE IF NOT EXISTS academic_periods (
    id              TEXT PRIMARY KEY,
    academic_year   TEXT NOT NULL,
    semester        TEXT NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(academic_year, semester)
);

INSERT OR IGNORE INTO academic_periods (id, academic_year, semester, is_active)
SELECT 
    strftime('%Y', 'now', 'localtime') || sem.code,
    strftime('%Y', 'now', 'localtime') || '/' || (CAST(strftime('%Y', 'now', 'localtime') AS INTEGER) + 1),
    sem.name,
    sem.active
FROM (
    SELECT '1' AS code, 'GANJIL' AS name, 1 AS active
    UNION ALL
    SELECT '2' AS code, 'GENAP' AS name, 0 AS active
) AS sem;


-- ----- EXAM TYPES (026) + SEED -----
CREATE TABLE IF NOT EXISTS exam_types (
    id          TEXT PRIMARY KEY,
    kode        TEXT NOT NULL UNIQUE,
    nama        TEXT NOT NULL,
    deskripsi   TEXT DEFAULT '',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_exam_types_kode ON exam_types(kode);

INSERT OR IGNORE INTO exam_types (id, kode, nama, deskripsi) VALUES
    ('etype-001', 'UTS',     'Ujian Tengah Semester', 'Ujian tengah semester ganjil/genap'),
    ('etype-002', 'UAS',     'Ujian Akhir Semester',  'Ujian akhir semester ganjil/genap'),
    ('etype-003', 'UH',      'Ulangan Harian',        'Ulangan per pertemuan / bab'),
    ('etype-004', 'SUSULAN', 'Ujian Susulan',         'Ujian pengganti untuk peserta tidak hadir');


-- ----- SCHOOL PROFILE (019) -----
CREATE TABLE IF NOT EXISTS school_profile (
    id                   TEXT PRIMARY KEY DEFAULT 'singleton',
    nss                  TEXT NOT NULL DEFAULT '',
    kode_sekolah         TEXT NOT NULL DEFAULT '',
    alamat_jalan         TEXT NOT NULL DEFAULT '',
    alamat_desa          TEXT NOT NULL DEFAULT '',
    alamat_kecamatan     TEXT NOT NULL DEFAULT '',
    alamat_kabupaten     TEXT NOT NULL DEFAULT '',
    alamat_provinsi      TEXT NOT NULL DEFAULT '',
    alamat_kode_pos      TEXT NOT NULL DEFAULT '',
    telp                 TEXT NOT NULL DEFAULT '',
    email                TEXT NOT NULL DEFAULT '',
    website              TEXT NOT NULL DEFAULT '',
    kepala_sekolah_nama  TEXT NOT NULL DEFAULT '',
    kepala_sekolah_nip   TEXT NOT NULL DEFAULT '',
    logo_url             TEXT NOT NULL DEFAULT '',
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO school_profile (id) VALUES ('singleton');