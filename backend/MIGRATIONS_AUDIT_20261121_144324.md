# Audit Migrations - Sat, Nov 21, 2026  2:43:24 PM

## File: ./000001_init_cbt_schema.down.sql
```
DROP TABLE IF EXISTS student_exam_results; 
DROP TABLE IF EXISTS questions; DROP TABLE IF EXISTS exams;```

## File: ./000001_init_cbt_schema.up.sql
```
-- 1. TABEL JADWAL/SESI UJIAN AKTIF
-- Pada SQLite3, tipe TEXT digunakan untuk menggantikan UUID, dan AUTOINCREMENT memakai INTEGER PRIMARY KEY
CREATE TABLE exams (
    id TEXT PRIMARY KEY, -- Kita akan meng-generate UUID murni dari kode Golang, bukan dari DB
    title TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    start_time TEXT NOT NULL, -- SQLite tidak memiliki tipe DATE/TIMESTAMP khusus, gunakan string TEXT ISO8601
    end_time TEXT NOT NULL
);

-- migrations/000001_init_cbt_schema.up.sql

-- Tabel untuk menyimpan bank soal
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL,
    question_text TEXT NOT NULL,
    media_url TEXT, -- URL absolut ke CDN/Object Storage
    correct_option TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel untuk menyimpan hasil akhir ujian (disinkronkan dari Redis)
CREATE TABLE IF NOT EXISTS exam_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id TEXT NOT NULL,
    exam_id TEXT NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    final_score REAL NOT NULL,
    status TEXT DEFAULT 'SUBMITTED',
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(participant_id, exam_id)
);

-- Index untuk mempercepat query
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_participant ON exam_results(participant_id);

-- Tabel untuk menampung data hasil sinkronisasi dari SIAKAD (Dapodik)
CREATE TABLE IF NOT EXISTS eligible_participants (
    participant_id TEXT PRIMARY KEY, -- UUID peserta_didik dari Dapodik
    nisn TEXT NOT NULL,
    name TEXT NOT NULL,
    rombel_name TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    pembelajaran_id TEXT NOT NULL, -- UUID dari tabel pembelajaran
    semester_id TEXT NOT NULL,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_eligible_nisn ON eligible_participants(nisn);
CREATE INDEX IF NOT EXISTS idx_eligible_pembelajaran ON eligible_participants(pembelajaran_id);```

## File: ./000002_add_sessions_and_archive.up.sql
```
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
-- eligible_participants sudah memiliki semester_id```

## File: ./000003_add_external_participants.up.sql
```
ALTER TABLE eligible_participants ADD COLUMN source TEXT DEFAULT 'SIAKAD'; -- 'SIAKAD' atau 'EXTERNAL'
ALTER TABLE eligible_participants ADD COLUMN external_school TEXT;         -- Nama sekolah/instansi asal (untuk eksternal)
ALTER TABLE eligible_participants ADD COLUMN external_class TEXT;          -- Kelas/rombel asal (untuk eksternal)
ALTER TABLE eligible_participants ADD COLUMN exam_id TEXT;                 -- Langsung bind ke exam_id (untuk eksternal)

CREATE INDEX IF NOT EXISTS idx_eligible_external_exam ON eligible_participants(exam_id, source);
-- 2. Membuat tabel khusus untuk import massal eksternal (Opsional, tapi bagus untuk audit)
CREATE TABLE IF NOT EXISTS external_import_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,          -- UUID batch import
    exam_id TEXT NOT NULL,
    total_records INTEGER,
    success_count INTEGER,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);```

## File: ./000004_add_question_types.up.sql
```
-- Tambahkan kolom tipe soal
ALTER TABLE questions ADD COLUMN question_type TEXT DEFAULT 'PG';
ALTER TABLE questions ADD COLUMN score REAL DEFAULT 10;
ALTER TABLE questions ADD COLUMN rubric TEXT;

-- Ubah kolom options menjadi lebih fleksibel (masih JSON string)
-- Tidak perlu alter karena kolom options sudah TEXT

CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);```

## File: ./000005_add_admins.down.sql
```
DROP TABLE IF EXISTS admins;```

## File: ./000005_add_admins.up.sql
```
CREATE TABLE IF NOT EXISTS admins (
    id            TEXT PRIMARY KEY,
    tenant_id     TEXT NOT NULL DEFAULT 'default',
    username      TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'ADMIN',
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, username)
);

CREATE INDEX IF NOT EXISTS idx_admins_tenant ON admins(tenant_id);```

## File: ./000006_add_essay_scores.up.sql
```
CREATE TABLE IF NOT EXISTS essay_scores (
    participant_id TEXT NOT NULL,
    exam_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    score REAL NOT NULL,
    graded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(participant_id, exam_id, question_id)
);```

## File: ./000007_fix_missing_columns.up.sql
```
-- Fix: kolom `options` di questions untuk menyimpan pilihan jawaban sebagai JSON
ALTER TABLE questions ADD COLUMN options TEXT DEFAULT '{}';

-- Fix: kolom `status` di exam_sessions
ALTER TABLE exam_sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'SCHEDULED';```

## File: ./000008_add_participant_credentials.down.sql
```
DROP TABLE IF EXISTS participant_credentials;```

## File: ./000008_add_participant_credentials.up.sql
```
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
    ON participant_credentials(username);```

## File: ./000009_add_exam_tokens.down.sql
```
DROP TABLE IF EXISTS exam_tokens;```

## File: ./000009_add_exam_tokens.up.sql
```
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
CREATE INDEX idx_exam_tokens_active ON exam_tokens(session_id, is_active);```

## File: ./000010_add_proctor_assignments.down.sql
```
DROP TABLE IF EXISTS proctor_assignments;```

## File: ./000010_add_proctor_assignments.up.sql
```
-- Penugasan proctor (guru) ke sesi ujian
CREATE TABLE IF NOT EXISTS proctor_assignments (
    id           TEXT PRIMARY KEY,
    proctor_id   TEXT NOT NULL,           -- FK ke admins.id (role=PROCTOR)
    session_id   TEXT NOT NULL,           -- FK ke exam_sessions.id
    class_name   TEXT DEFAULT '',         -- opsional: XII-1, XII-2
    assigned_by  TEXT,
    assigned_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proctor_id, session_id, class_name)
);
CREATE INDEX IF NOT EXISTS idx_proctor_assign_session
    ON proctor_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_proctor_assign_proctor
    ON proctor_assignments(proctor_id);```

## File: ./000011_add_attendance_makeup_payment.down.sql
```
DROP TABLE IF EXISTS payment_gates;
-- SQLite tidak support DROP COLUMN sebelum 3.35, skip```

## File: ./000011_add_attendance_makeup_payment.up.sql
```
-- Attendance tracking
ALTER TABLE participant_sessions ADD COLUMN attendance_status TEXT DEFAULT 'PENDING';
-- PENDING | PRESENT | ABSENT | EXCUSED

-- Makeup tracking
ALTER TABLE participant_sessions ADD COLUMN is_makeup INTEGER DEFAULT 0;
ALTER TABLE participant_sessions ADD COLUMN makeup_reason TEXT;
ALTER TABLE participant_sessions ADD COLUMN makeup_approved_by TEXT;
ALTER TABLE participant_sessions ADD COLUMN makeup_approved_at DATETIME;

CREATE INDEX IF NOT EXISTS idx_ps_attendance ON participant_sessions(attendance_status);
CREATE INDEX IF NOT EXISTS idx_ps_is_makeup ON participant_sessions(is_makeup) WHERE is_makeup = 1;

-- Payment gate (per siswa, keyed by NISN)
CREATE TABLE IF NOT EXISTS payment_gates (
    nisn            TEXT PRIMARY KEY,
    is_blocked      INTEGER NOT NULL DEFAULT 0,
    reason          TEXT,
    source          TEXT DEFAULT 'MANUAL',   -- MANUAL | SIAKAD
    blocked_by      TEXT,
    blocked_at      DATETIME,
    unblocked_by    TEXT,
    unblocked_at    DATETIME,
    note            TEXT
);
CREATE INDEX IF NOT EXISTS idx_payment_gates_blocked ON payment_gates(is_blocked) WHERE is_blocked = 1;```

## File: ./000012_add_tenant_id_columns.up.sql
```
-- ============================================
-- PHASE 2A: Add tenant_id to all tenant-level tables
-- Default 'default' untuk existing rows (backward compatible)
-- ============================================

-- 1. exam_results
ALTER TABLE exam_results ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_exam_results_tenant ON exam_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_tenant_exam ON exam_results(tenant_id, exam_id);

-- 2. exam_sessions
ALTER TABLE exam_sessions ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_exam_sessions_tenant ON exam_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_tenant_exam ON exam_sessions(tenant_id, exam_id);

-- 3. participant_sessions
ALTER TABLE participant_sessions ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_part_sessions_tenant ON participant_sessions(tenant_id);

-- 4. eligible_participants
ALTER TABLE eligible_participants ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_eligible_tenant ON eligible_participants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eligible_tenant_nisn ON eligible_participants(tenant_id, nisn);

-- 5. questions
ALTER TABLE questions ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_questions_tenant ON questions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_questions_tenant_exam ON questions(tenant_id, exam_id);

-- 6. exams
ALTER TABLE exams ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_exams_tenant ON exams(tenant_id);

-- 7. participant_credentials
ALTER TABLE participant_credentials ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_cred_tenant ON participant_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cred_tenant_username ON participant_credentials(tenant_id, username);

-- 8. payment_gates
ALTER TABLE payment_gates ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_payment_tenant ON payment_gates(tenant_id);

-- 9. exam_tokens (kalau ada — cek dulu sebelum apply)
-- Karena exam_tokens.session_id FK ke exam_sessions yang punya tenant_id,
-- mungkin tidak perlu tenant_id langsung. Skip dulu, cek nanti.

-- 10. proctor_assignments (FK ke proctor_id dan session_id)
-- Idem, tidak perlu tenant_id langsung. Skip.

-- ============================================
-- Verify: semua existing row jadi tenant='default'
-- ============================================```

## File: ./000014_add_tenant_status.down.sql
```
-- SQLite (pre-3.35) doesn't support DROP COLUMN. Safe to leave.
-- If needed to rollback: recreate table without columns.
SELECT 1;```

## File: ./000014_add_tenant_status.up.sql
```
-- ============================================
-- Add status column + onboarding fields to tenants
-- ============================================

-- 1. Add status column (nullable first, will be backfilled)
ALTER TABLE tenants ADD COLUMN status TEXT;

-- 2. Backfill existing rows
UPDATE tenants SET status = CASE
    WHEN is_active = 1 THEN 'ACTIVE'
    ELSE 'INACTIVE'
END;

-- 3. Onboarding support columns
ALTER TABLE tenants ADD COLUMN approved_at DATETIME;
ALTER TABLE tenants ADD COLUMN approved_by TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN rejected_reason TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN logo_url TEXT DEFAULT '';

-- 4. Index for pending queue
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_status_suspended ON tenants(status, is_suspended);```

## File: ./000015_add_pending_admin_username.down.sql
```
SELECT 1;```

## File: ./000015_add_pending_admin_username.up.sql
```
ALTER TABLE tenants ADD COLUMN pending_admin_username TEXT DEFAULT '';
UPDATE tenants SET pending_admin_username = 'admin' WHERE pending_admin_username = '';
```

## File: ./000016_add_tenant_jenjang.down.sql
```
SELECT 1;```

## File: ./000016_add_tenant_jenjang.up.sql
```
-- ============================================
-- Add jenjang + program_duration_years to tenants
-- VER-007 — jenjang adalah atribut tenant
-- ============================================

ALTER TABLE tenants ADD COLUMN jenjang TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN program_duration_years INTEGER DEFAULT 3;

-- Backfill existing tenants (default: SMA 3 tahun)
UPDATE tenants SET jenjang = 'SMA' WHERE jenjang = '' OR jenjang IS NULL;
UPDATE tenants SET program_duration_years = 3 WHERE program_duration_years IS NULL OR program_duration_years = 0;

CREATE INDEX IF NOT EXISTS idx_tenants_jenjang ON tenants(jenjang);```

## File: ./000017_add_master_keahlian.down.sql
```
DROP TABLE IF EXISTS tenant_programs;
DROP TABLE IF EXISTS master_program_keahlian;
DROP TABLE IF EXISTS master_bidang_keahlian;```

## File: ./000017_add_master_keahlian.up.sql
```
-- ============================================
-- Master Bidang & Program Keahlian (SMK/MAK)
-- VER-007 Extension
-- ============================================

-- 1. Bidang Keahlian (kategori)
CREATE TABLE IF NOT EXISTS master_bidang_keahlian (
    id          TEXT PRIMARY KEY,           -- kode: 'TI', 'OTO', 'BISNIS'
    nama        TEXT NOT NULL,              -- 'Teknologi Informasi'
    deskripsi   TEXT DEFAULT '',
    sort_order  INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Program Keahlian (jurusan)
CREATE TABLE IF NOT EXISTS master_program_keahlian (
    id          TEXT PRIMARY KEY,           -- UUID
    bidang_id   TEXT NOT NULL,              -- FK ke bidang
    kode        TEXT UNIQUE NOT NULL,       -- 'TKJ', 'RPL', 'TKR'
    nama        TEXT NOT NULL,              -- 'Teknik Komputer & Jaringan'
    deskripsi   TEXT DEFAULT '',
    is_default  INTEGER DEFAULT 0,          -- 1 = popular/default di form
    is_custom   INTEGER DEFAULT 0,          -- 1 = dibuat user (findOrCreate)
    created_by  TEXT DEFAULT '',            -- admin_id / 'system'
    sort_order  INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(bidang_id) REFERENCES master_bidang_keahlian(id)
);

CREATE INDEX IF NOT EXISTS idx_master_program_bidang ON master_program_keahlian(bidang_id);
CREATE INDEX IF NOT EXISTS idx_master_program_kode ON master_program_keahlian(kode);
CREATE INDEX IF NOT EXISTS idx_master_program_default ON master_program_keahlian(is_default);

-- 3. Mapping tenant ↔ program
CREATE TABLE IF NOT EXISTS tenant_programs (
    tenant_id   TEXT NOT NULL,
    program_id  TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(tenant_id, program_id),
    FOREIGN KEY(program_id) REFERENCES master_program_keahlian(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_programs_tenant ON tenant_programs(tenant_id);

-- ============================================
-- SEED: 10 Bidang Keahlian (popular)
-- ============================================
INSERT OR IGNORE INTO master_bidang_keahlian (id, nama, deskripsi, sort_order) VALUES
    ('TI',      'Teknologi Informasi',        'Bidang TI: pemrograman, jaringan, multimedia', 1),
    ('OTO',     'Teknologi Otomotif',         'Bidang otomotif: kendaraan ringan, sepeda motor', 2),
    ('BISNIS',  'Bisnis dan Manajemen',       'Bidang bisnis: akuntansi, perkantoran, pemasaran', 3),
    ('ELEKTRO', 'Teknologi Elektronika',      'Bidang elektronika: audio video, instrumentasi', 4),
    ('MESIN',   'Teknik Mesin',               'Bidang mesin: pemesinan, las, fabrikasi', 5),
    ('BANGUNAN','Teknologi Konstruksi',       'Bidang bangunan: arsitektur, sipil', 6),
    ('KESEHATAN','Kesehatan dan Farmasi',     'Bidang kesehatan: asisten keperawatan, farmasi', 7),
    ('AGRI',    'Agribisnis dan Agriteknologi','Bidang pertanian: tanaman, peternakan, perikanan', 8),
    ('PARIWISATA','Pariwisata dan Perhotelan','Bidang pariwisata: perhotelan, tata boga, usaha wisata', 9),
    ('SENI',    'Seni dan Ekonomi Kreatif',   'Bidang seni: DKV, desain produk, kriya', 10);

-- ============================================
-- SEED: Program Keahlian (popular + default)
-- ============================================
INSERT OR IGNORE INTO master_program_keahlian (id, bidang_id, kode, nama, is_default, sort_order) VALUES
    -- Teknologi Informasi (default: TKJ, RPL)
    ('prog-tkj',     'TI',      'TKJ',  'Teknik Komputer dan Jaringan',      1, 1),
    ('prog-rpl',     'TI',      'RPL',  'Rekayasa Perangkat Lunak',          1, 2),
    ('prog-mm',      'TI',      'MM',   'Multimedia',                        0, 3),
    ('prog-tkj-4t',  'TI',      'TKJ4', 'Teknik Komputer & Jaringan (4 th)', 0, 4),

    -- Teknologi Otomotif (default: TKR, TSM)
    ('prog-tkr',     'OTO',     'TKR',  'Teknik Kendaraan Ringan',           1, 1),
    ('prog-tsm',     'OTO',     'TSM',  'Teknik Sepeda Motor',               1, 2),
    ('prog-tbsm',    'OTO',     'TBSM', 'Teknik Bisnis Sepeda Motor',        0, 3),

    -- Bisnis & Manajemen (default: AKL, MPLB)
    ('prog-akl',     'BISNIS',  'AKL',  'Akuntansi dan Keuangan Lembaga',    1, 1),
    ('prog-mplb',    'BISNIS',  'MPLB', 'Manajemen Perkantoran & Layanan Bisnis', 1, 2),
    ('prog-bdp',     'BISNIS',  'BDP',  'Bisnis Digital & Pemasaran',        0, 3),
    ('prog-otkp',    'BISNIS',  'OTKP', 'Otomatisasi Tata Kelola Perkantoran',0, 4),

    -- Elektronika
    ('prog-tav',     'ELEKTRO', 'TAV',  'Teknik Audio Video',                0, 1),
    ('prog-tei',     'ELEKTRO', 'TEI',  'Teknik Elektronika Industri',       0, 2),

    -- Mesin
    ('prog-tpm',     'MESIN',   'TPM',  'Teknik Pemesinan',                  0, 1),
    ('prog-tflm',    'MESIN',   'TFLM', 'Teknik Fabrikasi Logam & Manufaktur',0, 2),

    -- Bangunan
    ('prog-dpib',    'BANGUNAN','DPIB', 'Desain Pemodelan & Info Bangunan',  0, 1),
    ('prog-tkp',     'BANGUNAN','TKP',  'Teknik Konstruksi & Properti',      0, 2),

    -- Kesehatan
    ('prog-akf',     'KESEHATAN','AKF', 'Asisten Keperawatan & Farmasi',     0, 1),

    -- Agri
    ('prog-atp',     'AGRI',    'ATP',  'Agribisnis Tanaman Pangan',         0, 1),
    ('prog-aphp',    'AGRI',    'APHP', 'Agribisnis Pengolahan Hasil Pertanian',0, 2),

    -- Pariwisata
    ('prog-upw',     'PARIWISATA','UPW','Usaha Perjalanan Wisata',           0, 1),
    ('prog-ph',      'PARIWISATA','PH', 'Perhotelan',                        0, 2),

    -- Seni
    ('prog-dkv',     'SENI',    'DKV',  'Desain Komunikasi Visual',          0, 1);```

## File: ./000018_create_siswa.down.sql
```
-- Rollback BCR-1
DROP TABLE IF EXISTS siswa;```

## File: ./000018_create_siswa.up.sql
```
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
CREATE INDEX IF NOT EXISTS idx_siswa_status ON siswa(status);```

## File: ./000019_create_school_profile.down.sql
```
-- Rollback BCR-2
DROP TABLE IF EXISTS school_profile;
```

## File: ./000019_create_school_profile.up.sql
```
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
```

## File: ./000020_create_classes.down.sql
```
DROP TABLE IF EXISTS classes;
```

## File: ./000020_create_classes.up.sql
```
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
```

## File: ./000021_create_teachers_rooms.down.sql
```
ALTER TABLE classes DROP COLUMN wali_kelas_nama;
ALTER TABLE classes DROP COLUMN ruang_nama;
ALTER TABLE classes DROP COLUMN ruang_id;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS teachers;
```

## File: ./000021_create_teachers_rooms.up.sql
```
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
```

## File: ./000022_update_classes_columns.down.sql
```
ALTER TABLE classes DROP COLUMN kurikulum;
ALTER TABLE classes DROP COLUMN jenis_rombel;
```

## File: ./000022_update_classes_columns.up.sql
```
ALTER TABLE classes ADD COLUMN kurikulum TEXT DEFAULT 'K13';
ALTER TABLE classes ADD COLUMN jenis_rombel TEXT DEFAULT 'REGULER';
```

## File: ./000023_create_subjects.down.sql
```
DROP TABLE IF EXISTS subjects;
```

## File: ./000023_create_subjects.up.sql
```
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
```

## File: ./000024_update_rooms_teachers.down.sql
```
ALTER TABLE rooms RENAME COLUMN gedung TO lokasi;
ALTER TABLE teachers DROP COLUMN username;
ALTER TABLE teachers DROP COLUMN homeroom_class_nama;
ALTER TABLE teachers DROP COLUMN subject_id;
```

## File: ./000024_update_rooms_teachers.up.sql
```
-- Sesuaikan Rooms dengan FE (gedung) & Teachers dengan FE (username, homeroom)
ALTER TABLE rooms RENAME COLUMN lokasi TO gedung;
ALTER TABLE teachers ADD COLUMN username TEXT DEFAULT '';
ALTER TABLE teachers ADD COLUMN homeroom_class_nama TEXT DEFAULT '';
ALTER TABLE teachers ADD COLUMN subject_id TEXT DEFAULT '';
```

## File: ./000025_update_teachers_auth.down.sql
```
ALTER TABLE teachers DROP COLUMN email;
ALTER TABLE teachers DROP COLUMN password_hash;
ALTER TABLE teachers DROP COLUMN password_plain;
ALTER TABLE teachers DROP COLUMN teaching_subject_ids;
ALTER TABLE teachers DROP COLUMN is_homeroom;
ALTER TABLE teachers DROP COLUMN homeroom_class_id;
ALTER TABLE teachers DROP COLUMN has_logged_in;
```

## File: ./000025_update_teachers_auth.up.sql
```
-- BCR: Guru & Proctor Auth & Multi-Subject
-- Menghapus subject_id lama jika ada (opsional, kita abaikan saja agar tidak error di SQLite)
ALTER TABLE teachers ADD COLUMN email TEXT DEFAULT '';
ALTER TABLE teachers ADD COLUMN password_hash TEXT DEFAULT '';
ALTER TABLE teachers ADD COLUMN password_plain TEXT DEFAULT '';
ALTER TABLE teachers ADD COLUMN teaching_subject_ids TEXT DEFAULT '[]';
ALTER TABLE teachers ADD COLUMN is_homeroom INTEGER DEFAULT 0;
ALTER TABLE teachers ADD COLUMN homeroom_class_id TEXT DEFAULT '';
ALTER TABLE teachers ADD COLUMN has_logged_in INTEGER DEFAULT 0;
```

## File: ./000026_create_exam_types.down.sql
```
DROP TABLE IF EXISTS exam_types;
```

## File: ./000026_create_exam_types.up.sql
```
CREATE TABLE IF NOT EXISTS exam_types (
    id            TEXT PRIMARY KEY,
    kode          TEXT NOT NULL UNIQUE,
    nama          TEXT NOT NULL,
    deskripsi     TEXT DEFAULT '',
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_exam_types_kode ON exam_types(kode);

-- Seed data default
INSERT OR IGNORE INTO exam_types (id, kode, nama, deskripsi) VALUES 
('etype-001', 'UTS', 'Ujian Tengah Semester', 'Ujian tengah semester ganjil/genap'),
('etype-002', 'UAS', 'Ujian Akhir Semester', 'Ujian akhir semester ganjil/genap'),
('etype-003', 'UH', 'Ulangan Harian', 'Ulangan per pertemuan / bab'),
('etype-004', 'SUSULAN', 'Ujian Susulan', 'Ujian pengganti untuk peserta tidak hadir');
```

## File: ./000027_create_lessons.down.sql
```
DROP TABLE IF EXISTS lessons;
```

## File: ./000027_create_lessons.up.sql
```
-- BCR-6: Master Pembelajaran (Relasi Mapel - Kelas - Guru)
CREATE TABLE IF NOT EXISTS lessons (
    id            TEXT PRIMARY KEY,
    subject_id    TEXT NOT NULL,
    class_id      TEXT NOT NULL,
    teacher_id    TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    semester      TEXT NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lessons_subject ON lessons(subject_id);
CREATE INDEX IF NOT EXISTS idx_lessons_class ON lessons(class_id);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher ON lessons(teacher_id);
```

## File: ./000028_create_exam_schedules.down.sql
```
DROP TABLE IF EXISTS exam_schedule_details;
DROP TABLE IF EXISTS exam_schedules;
```

## File: ./000028_create_exam_schedules.up.sql
```
-- BCR-7: Manajemen Jadwal Ujian (Master-Detail)
CREATE TABLE IF NOT EXISTS exam_schedules (
    id              TEXT PRIMARY KEY,
    jenis_ujian_id  TEXT NOT NULL,
    academic_year   TEXT NOT NULL,
    semester        TEXT NOT NULL,
    tingkat         TEXT NOT NULL,
    tanggal         TEXT NOT NULL,
    jam_mulai       TEXT NOT NULL,
    durasi_menit    INTEGER NOT NULL,
    subject_id      TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'DRAFT',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_es_jenis ON exam_schedules(jenis_ujian_id);
CREATE INDEX IF NOT EXISTS idx_es_tanggal ON exam_schedules(tanggal);

CREATE TABLE IF NOT EXISTS exam_schedule_details (
    id              TEXT PRIMARY KEY,
    schedule_id     TEXT NOT NULL,
    class_id        TEXT NOT NULL,
    ruang_id        TEXT,
    pengawas1_id    TEXT,
    pengawas2_id    TEXT,
    FOREIGN KEY(schedule_id) REFERENCES exam_schedules(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_esd_schedule ON exam_schedule_details(schedule_id);
```

## File: ./000029_fix_exam_schedules.down.sql
```
DROP TABLE IF EXISTS exam_schedules;
```

## File: ./000029_fix_exam_schedules.up.sql
```
-- Hapus tabel lama yang terlalu kompleks
DROP TABLE IF EXISTS exam_schedule_details;
DROP TABLE IF EXISTS exam_schedules;

-- Buat tabel baru yang terhubung langsung ke Pembelajaran (Lessons)
CREATE TABLE exam_schedules (
    id              TEXT PRIMARY KEY,
    lesson_id       TEXT NOT NULL,
    jenis_ujian_id  TEXT NOT NULL,
    tanggal         TEXT NOT NULL,
    jam_mulai       TEXT NOT NULL,
    durasi_menit    INTEGER NOT NULL,
    pengawas1_id    TEXT,
    pengawas2_id    TEXT,
    ruang_id        TEXT,
    status          TEXT NOT NULL DEFAULT 'DRAFT',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_es_lesson ON exam_schedules(lesson_id);
CREATE INDEX IF NOT EXISTS idx_es_tanggal ON exam_schedules(tanggal);
```

## File: ./000030_academic_periods.down.sql
```
ALTER TABLE exam_schedules DROP COLUMN semester;
ALTER TABLE exam_schedules DROP COLUMN academic_year;
DROP TABLE IF EXISTS academic_periods;
```

## File: ./000030_academic_periods.up.sql
```
-- 1. Tabel Master Periode (Jantung Data)
CREATE TABLE IF NOT EXISTS academic_periods (
    id              TEXT PRIMARY KEY,
    academic_year   TEXT NOT NULL,
    semester        TEXT NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(academic_year, semester)
);

-- Seed periode default (aktif)
INSERT OR IGNORE INTO academic_periods (id, academic_year, semester, is_active) 
VALUES ('period-2025-ganjil', '2025/2026', 'GANJIL', 1);

-- 2. Tambah kolom eksplisit di exam_schedules
ALTER TABLE exam_schedules ADD COLUMN academic_year TEXT;
ALTER TABLE exam_schedules ADD COLUMN semester TEXT;

-- 3. Backfill data lama (dari tabel lessons)
UPDATE exam_schedules 
SET academic_year = (SELECT academic_year FROM lessons WHERE lessons.id = exam_schedules.lesson_id),
    semester = (SELECT semester FROM lessons WHERE lessons.id = exam_schedules.lesson_id)
WHERE academic_year IS NULL;
```

## File: ./000031_create_class_members.down.sql
```
DROP TABLE IF EXISTS class_members;
```

## File: ./000031_create_class_members.up.sql
```
-- FASE B: Separate Master vs Temporal
CREATE TABLE IF NOT EXISTS class_members (
    id             TEXT PRIMARY KEY,
    siswa_id       TEXT NOT NULL,
    class_id       TEXT NOT NULL,
    academic_year  TEXT NOT NULL,
    semester       TEXT NOT NULL,
    is_active      INTEGER NOT NULL DEFAULT 1,
    moved_at       DATETIME,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cm_siswa ON class_members(siswa_id);
CREATE INDEX IF NOT EXISTS idx_cm_class ON class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_cm_period ON class_members(academic_year, semester);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cm_active ON class_members(siswa_id, academic_year, semester) WHERE is_active = 1;

-- Backfill: semua siswa existing ke periode aktif
INSERT OR IGNORE INTO class_members (id, siswa_id, class_id, academic_year, semester, is_active)
SELECT 
    'cm-' || s.id || '-' || ap.academic_year || '-' || ap.semester,
    s.id,
    s.kelas_id,
    ap.academic_year,
    ap.semester,
    1
FROM siswa s
CROSS JOIN academic_periods ap
WHERE ap.is_active = 1;
```

## File: ./000032_temporal_classes.down.sql
```
DROP TABLE IF EXISTS rollover_logs;
DROP INDEX IF EXISTS idx_classes_period;
ALTER TABLE classes DROP COLUMN semester;
ALTER TABLE classes DROP COLUMN academic_year;
```

## File: ./000032_temporal_classes.up.sql
```
-- FASE C.1: Classes Temporal
-- Tambah kolom periode ke classes
ALTER TABLE classes ADD COLUMN academic_year TEXT;
ALTER TABLE classes ADD COLUMN semester TEXT;

-- Backfill: semua kelas existing ke periode aktif
UPDATE classes SET 
    academic_year = (SELECT academic_year FROM academic_periods WHERE is_active = 1 LIMIT 1),
    semester = (SELECT semester FROM academic_periods WHERE is_active = 1 LIMIT 1)
WHERE academic_year IS NULL;

CREATE INDEX IF NOT EXISTS idx_classes_period ON classes(academic_year, semester);

-- Tabel audit rollover
CREATE TABLE IF NOT EXISTS rollover_logs (
    id              TEXT PRIMARY KEY,
    from_period     TEXT NOT NULL,
    to_period       TEXT NOT NULL,
    classes_copied  INTEGER NOT NULL DEFAULT 0,
    students_copied INTEGER NOT NULL DEFAULT 0,
    lessons_copied  INTEGER NOT NULL DEFAULT 0,
    graduates_count INTEGER NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## File: ./000033_period_id_format.down.sql
```
-- Tidak ada rollback spesifik — ID hanyalah opaque string.
-- Untuk rollback, restore dari backup DB.
```

## File: ./000033_period_id_format.up.sql
```
-- FASE C.1.1: Ubah ID academic_periods ke format [YYYY][1|2]
-- 1 = GANJIL, 2 = GENAP
-- Contoh: 2025/2026 GANJIL → 20251

-- Update semua existing rows
UPDATE academic_periods SET id = '20251' WHERE academic_year = '2025/2026' AND semester = 'GANJIL';
UPDATE academic_periods SET id = '20252' WHERE academic_year = '2025/2026' AND semester = 'GENAP';
UPDATE academic_periods SET id = '20261' WHERE academic_year = '2026/2027' AND semester = 'GANJIL';
UPDATE academic_periods SET id = '20262' WHERE academic_year = '2026/2027' AND semester = 'GENAP';
```

## File: ./000034_add_academic_period_fk.down.sql
```
DROP INDEX IF EXISTS idx_exam_schedules_period_fk;
DROP INDEX IF EXISTS idx_lessons_period_fk;
DROP INDEX IF EXISTS idx_class_members_period_fk;
DROP INDEX IF EXISTS idx_classes_period_fk;
ALTER TABLE exam_schedules DROP COLUMN academic_period_id;
ALTER TABLE lessons DROP COLUMN academic_period_id;
ALTER TABLE class_members DROP COLUMN academic_period_id;
ALTER TABLE classes DROP COLUMN academic_period_id;
```

## File: ./000034_add_academic_period_fk.up.sql
```
-- FASE C.0.5: FK academic_period_id ke 4 tabel temporal
-- 1. Tambah kolom
ALTER TABLE classes         ADD COLUMN academic_period_id TEXT REFERENCES academic_periods(id);
ALTER TABLE class_members   ADD COLUMN academic_period_id TEXT REFERENCES academic_periods(id);
ALTER TABLE lessons         ADD COLUMN academic_period_id TEXT REFERENCES academic_periods(id);
ALTER TABLE exam_schedules  ADD COLUMN academic_period_id TEXT REFERENCES academic_periods(id);

-- 2. Backfill dari existing (academic_year + semester string)
UPDATE classes SET academic_period_id = (
    SELECT id FROM academic_periods 
    WHERE academic_year = classes.academic_year AND semester = classes.semester LIMIT 1
) WHERE academic_period_id IS NULL;

UPDATE class_members SET academic_period_id = (
    SELECT id FROM academic_periods 
    WHERE academic_year = class_members.academic_year AND semester = class_members.semester LIMIT 1
) WHERE academic_period_id IS NULL;

UPDATE lessons SET academic_period_id = (
    SELECT id FROM academic_periods 
    WHERE academic_year = lessons.academic_year AND semester = lessons.semester LIMIT 1
) WHERE academic_period_id IS NULL;

UPDATE exam_schedules SET academic_period_id = (
    SELECT id FROM academic_periods 
    WHERE academic_year = exam_schedules.academic_year AND semester = exam_schedules.semester LIMIT 1
) WHERE academic_period_id IS NULL;

-- 3. Index untuk performa
CREATE INDEX IF NOT EXISTS idx_classes_period_fk ON classes(academic_period_id);
CREATE INDEX IF NOT EXISTS idx_class_members_period_fk ON class_members(academic_period_id);
CREATE INDEX IF NOT EXISTS idx_lessons_period_fk ON lessons(academic_period_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_period_fk ON exam_schedules(academic_period_id);
```

## File: ./000035_add_teacher_password_enc.down.sql
```
-- no-op: rollback dilakukan manual (drop column) — data preserved untuk audit
```

## File: ./000035_add_teacher_password_enc.up.sql
```
ALTER TABLE teachers ADD COLUMN password_enc BLOB;
ALTER TABLE teachers ADD COLUMN password_iv BLOB;
```

## File: ./000036_drop_teacher_password_plain.down.sql
```
-- irreversible tanpa backup; restore dari .bak kalau perlu
```

## File: ./000036_drop_teacher_password_plain.up.sql
```
-- ⚠️ JANGAN jalankan sebelum backfill verified (semua row punya password_enc+iv)
ALTER TABLE teachers DROP COLUMN password_plain;
```

## File: ./000037_create_tenant_settings.sql
```
-- 000037_create_tenant_settings.sql
-- Tabel untuk menyimpan status global per-tenant (Exam Mode, dll)

CREATE TABLE IF NOT EXISTS tenant_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default value: Exam mode mati
INSERT OR IGNORE INTO tenant_settings (key, value) VALUES ('exam_mode', '');
```

## File: ./000038_seed_test_participants.down.sql
```
DELETE FROM participant_credentials WHERE generated_by = 'seed_d2';
```

## File: ./000038_seed_test_participants.up.sql
```
-- Seed 3 peserta uji coba untuk Fase D.2
-- CATATAN: PasswordEnc dan PasswordIV di sini adalah placeholder. 
-- Setelah apply, Admin HARUS klik "Reset Password" di UI untuk 3 NISN ini 
-- agar ciphertext menjadi valid dan bisa didekripsi oleh crypto.Cipher.

INSERT OR IGNORE INTO participant_credentials (nisn, username, password_enc, password_iv, is_active, tenant_id, generated_at, generated_by)
VALUES 
    ('99000001', '99000001', X'00', X'00', 1, 'default', CURRENT_TIMESTAMP, 'seed_d2'),
    ('99000002', '99000002', X'00', X'00', 1, 'default', CURRENT_TIMESTAMP, 'seed_d2'),
    ('99000003', '99000003', X'00', X'00', 1, 'default', CURRENT_TIMESTAMP, 'seed_d2');
```

## File: ./000039_seed_exam_sessions.down.sql
```
DELETE FROM exam_sessions WHERE id LIKE 'sess-%';
```

## File: ./000039_seed_exam_sessions.up.sql
```
-- Update existing exams to have valid ISO8601 times
UPDATE exams
SET start_time = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
    end_time = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+90 minutes')
WHERE start_time IS NULL OR start_time = '';

-- Insert default exam_session for any exam that doesn't have one (min 3 baris)
INSERT INTO exam_sessions (id, exam_id, session_type, start_time, end_time, semester_id, status, tenant_id)
SELECT
    'sess-' || lower(hex(randomblob(16))),
    id,
    'REGULER',
    start_time,
    end_time,
    academic_period_id,
    'SCHEDULED',
    tenant_id
FROM exams e
WHERE NOT EXISTS (
    SELECT 1 FROM exam_sessions es WHERE es.exam_id = e.id
);
```

## File: ./000040_add_card_state_to_credentials.down.sql
```
-- Rollback
DROP INDEX IF EXISTS idx_cred_revoked;
DROP INDEX IF EXISTS idx_cred_qr_token;
-- Catatan: SQLite tidak support DROP COLUMN sebelum 3.35, jadi kita biarkan kolomnya (tidak berbahaya)
```

## File: ./000040_add_card_state_to_credentials.up.sql
```
-- Tambah kolom untuk state kartu (QR, Device, Revoke)
ALTER TABLE participant_credentials ADD COLUMN qr_token TEXT;
ALTER TABLE participant_credentials ADD COLUMN device_fingerprint TEXT;
ALTER TABLE participant_credentials ADD COLUMN is_revoked INTEGER DEFAULT 0;

-- Index untuk lookup QR token yang cepat
CREATE INDEX IF NOT EXISTS idx_cred_qr_token ON participant_credentials(qr_token);
CREATE INDEX IF NOT EXISTS idx_cred_revoked ON participant_credentials(is_revoked);
```

## File: ./000041_seed_exam_sessions.down.sql
```
DELETE FROM exam_sessions WHERE id LIKE 'sess-%';
```

## File: ./000041_seed_exam_sessions.up.sql
```
-- Update existing exams to have valid ISO8601 times
UPDATE exams
SET start_time = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
    end_time = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+90 minutes')
WHERE start_time IS NULL OR start_time = '';

-- Insert default exam_session for any exam that doesn't have one (min 3 baris)
INSERT INTO exam_sessions (id, exam_id, session_type, start_time, end_time, semester_id, status, tenant_id)
SELECT
    'sess-' || lower(hex(randomblob(16))),
    id,
    'REGULER',
    start_time,
    end_time,
    academic_period_id,
    'SCHEDULED',
    tenant_id
FROM exams e
WHERE NOT EXISTS (
    SELECT 1 FROM exam_sessions es WHERE es.exam_id = e.id
);
```

## File: ./000042_sync_legacy_schedules.down.sql
```
SELECT 1;
```

## File: ./000042_sync_legacy_schedules.up.sql
```
INSERT INTO exams (id, title, duration_minutes, start_time, end_time, tenant_id, academic_period_id)
SELECT lower(hex(randomblob(16))), s.nama || ' - ' || et.nama, es.durasi_menit,
       es.tanggal || 'T' || es.jam_mulai || ':00Z',
       strftime('%Y-%m-%dT%H:%M:%SZ', datetime(es.tanggal || ' ' || es.jam_mulai, '+' || es.durasi_menit || ' minutes')),
       'default', es.academic_period_id
FROM exam_schedules es
JOIN lessons l ON l.id = es.lesson_id
JOIN subjects s ON s.id = l.subject_id
JOIN exam_types et ON et.id = es.jenis_ujian_id
WHERE NOT EXISTS (SELECT 1 FROM exams e WHERE e.title = (s.nama || ' - ' || et.nama) AND e.start_time = (es.tanggal || 'T' || es.jam_mulai || ':00Z'));

INSERT INTO exam_sessions (id, exam_id, session_type, start_time, end_time, semester_id, status, tenant_id)
SELECT lower(hex(randomblob(16))), e.id, 'REGULER', e.start_time, e.end_time, e.academic_period_id, 'SCHEDULED', e.tenant_id
FROM exams e WHERE NOT EXISTS (SELECT 1 FROM exam_sessions sess WHERE sess.exam_id = e.id);

INSERT OR IGNORE INTO participant_sessions (participant_id, session_id, status, tenant_id)
SELECT cm.siswa_id, sess.id, 'ELIGIBLE', sess.tenant_id
FROM class_members cm
JOIN exam_sessions sess ON sess.semester_id = cm.academic_period_id
JOIN exams e ON e.id = sess.exam_id
JOIN lessons l ON l.class_id = cm.class_id
JOIN subjects s ON s.id = l.subject_id
WHERE cm.is_active = 1 AND cm.academic_period_id = sess.semester_id;
```

## File: ./000043_fix_schedule_sync.down.sql
```
-- Rollback tidak mengembalikan data yang sudah dihapus, hanya placeholder
SELECT 1;
```

## File: ./000043_fix_schedule_sync.up.sql
```
-- 1. Fix Timezone: Ubah format 'Z' (UTC) menjadi '+07:00' (WIB) di tabel exams dan exam_sessions
UPDATE exams 
SET start_time = replace(start_time, 'Z', '+07:00'),
    end_time = replace(end_time, 'Z', '+07:00')
WHERE start_time LIKE '%Z';

UPDATE exam_sessions 
SET start_time = replace(start_time, 'Z', '+07:00'),
    end_time = replace(end_time, 'Z', '+07:00')
WHERE start_time LIKE '%Z';

-- 2. Hapus participant_sessions yang salah kelas (Cartesian Product)
-- (Siswa hanya boleh terhubung ke sesi ujian dari mapel yang dia ambil di kelasnya)
DELETE FROM participant_sessions 
WHERE participant_id NOT IN (
    SELECT cm.siswa_id 
    FROM class_members cm
    JOIN lessons l ON l.class_id = cm.class_id
    JOIN exam_schedules es ON es.lesson_id = l.id
    JOIN exams e ON e.title = (SELECT s.nama FROM subjects s WHERE s.id = l.subject_id) || ' - ' || (SELECT nama FROM exam_types et WHERE et.id = es.jenis_ujian_id)
);

-- 3. Assign ulang secara ketat berdasarkan Kelas & Lesson ID (menggunakan jembatan mata pelajaran)
-- (Hati-hati: SQL ini memastikan hanya siswa di kelas terkait yang mendapat jadwal)
INSERT OR IGNORE INTO participant_sessions (participant_id, session_id, status, tenant_id)
SELECT cm.siswa_id, sess.id, 'ELIGIBLE', sess.tenant_id
FROM class_members cm
JOIN lessons l ON l.class_id = cm.class_id
JOIN subjects s ON s.id = l.subject_id
JOIN exam_schedules es ON es.lesson_id = l.id
JOIN exams e ON e.title = (s.nama || ' - ' || (SELECT nama FROM exam_types et WHERE et.id = es.jenis_ujian_id))
JOIN exam_sessions sess ON sess.exam_id = e.id
WHERE cm.is_active = 1;
```

## File: ./000044_fix_cartesian_sessions.down.sql
```
-- Tidak ada rollback destruktif
SELECT 1;
```

## File: ./000044_fix_cartesian_sessions.up.sql
```
-- 1. Bersihkan tabel participant_sessions dari data hasil sinkronisasi yang salah
DELETE FROM participant_sessions;

-- 2. Assign ulang secara presisi (Siswa HANYA mendapat jadwal jika kelasnya cocok dengan lesson)
INSERT OR IGNORE INTO participant_sessions (participant_id, session_id, status, tenant_id)
SELECT cm.siswa_id, sess.id, 'ELIGIBLE', sess.tenant_id
FROM class_members cm
JOIN lessons l ON l.class_id = cm.class_id
JOIN exam_schedules es ON es.lesson_id = l.id
JOIN subjects s ON s.id = l.subject_id
JOIN exam_types et ON et.id = es.jenis_ujian_id
JOIN exams e ON e.title = (s.nama || ' - ' || et.nama)
JOIN exam_sessions sess ON sess.exam_id = e.id
WHERE cm.is_active = 1;
```

## File: ./000045_backfill_exam_relations.down.sql
```
SELECT 1;
```

## File: ./000045_backfill_exam_relations.up.sql
```
UPDATE exams
SET subject_id = l.subject_id,
    class_id = l.class_id,
    jenis_ujian_id = es.jenis_ujian_id
FROM exam_schedules es
JOIN lessons l ON l.id = es.lesson_id
JOIN subjects s ON s.id = l.subject_id
JOIN exam_types et ON et.id = es.jenis_ujian_id
WHERE exams.title = (s.nama || ' - ' || et.nama)
  AND exams.start_time = (es.tanggal || 'T' || es.jam_mulai || ':00+07:00')
  AND exams.academic_period_id = es.academic_period_id;
```

## File: ./000046_seed_questions_for_exams.down.sql
```
DELETE FROM questions WHERE id IN ('q-kod-1', 'q-kod-2', 'q-kod-3', 'q-indo-1', 'q-indo-2', 'q-indo-3');
```

## File: ./000046_seed_questions_for_exams.up.sql
```
-- Seed Soal untuk Ujian Koding (ef3f5b297dfbbcc20adcd926ec86dfb0)
INSERT OR IGNORE INTO questions (id, exam_id, question_text, question_type, score, options, correct_option, created_at)
VALUES
('q-kod-1', 'ef3f5b297dfbbcc20adcd926ec86dfb0', 'Apa itu variabel dalam pemrograman?', 'MULTIPLE_CHOICE', 10, '[{"id":"A","text":"Tempat menyimpan data"},{"id":"B","text":"Alat untuk mencetak"},{"id":"C","text":"Mesin kompilasi"},{"id":"D","text":"Sistem operasi"}]', 'A', datetime('now')),
('q-kod-2', 'ef3f5b297dfbbcc20adcd926ec86dfb0', 'Sebutkan tipe data untuk angka desimal!', 'MULTIPLE_CHOICE', 10, '[{"id":"A","text":"Integer"},{"id":"B","text":"Float"},{"id":"C","text":"String"},{"id":"D","text":"Boolean"}]', 'B', datetime('now')),
('q-kod-3', 'ef3f5b297dfbbcc20adcd926ec86dfb0', 'Jelaskan secara singkat apa itu AI!', 'ESSAY', 20, '[]', '', datetime('now'));

-- Seed Soal untuk Ujian B. Indo (d69d82bb918088eb5e5c993bf674e55a)
INSERT OR IGNORE INTO questions (id, exam_id, question_text, question_type, score, options, correct_option, created_at)
VALUES
('q-indo-1', 'd69d82bb918088eb5e5c993bf674e55a', 'Apa ibu kota Indonesia?', 'MULTIPLE_CHOICE', 10, '[{"id":"A","text":"Bandung"},{"id":"B","text":"Surabaya"},{"id":"C","text":"Jakarta"},{"id":"D","text":"Medan"}]', 'C', datetime('now')),
('q-indo-2', 'd69d82bb918088eb5e5c993bf674e55a', 'Sebutkan 3 pahlawan nasional Indonesia!', 'ESSAY', 20, '[]', '', datetime('now')),
('q-indo-3', 'd69d82bb918088eb5e5c993bf674e55a', 'Tuliskan sebuah puisi pendek tentang kemerdekaan.', 'ESSAY', 30, '[]', '', datetime('now'));
```

## File: ./999_loadtest_seed.sql
```
-- ============================================
-- LOAD TEST SEED — 1000 peserta
-- ============================================

-- Hapus data load test lama (idempotent)
DELETE FROM participant_credentials WHERE nisn LIKE '99%' AND nisn > '999999';
DELETE FROM participant_sessions WHERE participant_id LIKE 'load-p%';
DELETE FROM eligible_participants WHERE participant_id LIKE 'load-p%';
DELETE FROM exam_results WHERE exam_id = 'loadtest-exam';
DELETE FROM questions WHERE exam_id = 'loadtest-exam';
DELETE FROM exam_sessions WHERE exam_id = 'loadtest-exam';
DELETE FROM exams WHERE id = 'loadtest-exam';

-- 1. Buat exam
INSERT INTO exams (id, title, duration_minutes, start_time, end_time)
VALUES ('loadtest-exam', 'Load Test Exam', 60,
        datetime('now'), datetime('now', '+2 hours'));

-- 2. Buat session (aktif sekarang - 2 jam)
INSERT INTO exam_sessions (id, exam_id, session_type, start_time, end_time, status, semester_id)
VALUES ('loadtest-sess', 'loadtest-exam', 'REGULER',
        datetime('now', '-5 minutes'), datetime('now', '+2 hours'),
        'SCHEDULED', '20261');

-- 3. Buat 5 soal (simple PG)
INSERT INTO questions (id, exam_id, question_text, correct_option, question_type, score, options)
VALUES
  ('lq1', 'loadtest-exam', 'Soal 1 + 1 = ?', 'A', 'PG', 20, '{"A":"2","B":"3","C":"4","D":"5"}'),
  ('lq2', 'loadtest-exam', 'Soal 2 + 2 = ?', 'C', 'PG', 20, '{"A":"2","B":"3","C":"4","D":"5"}'),
  ('lq3', 'loadtest-exam', 'Soal 3 + 3 = ?', 'D', 'PG', 20, '{"A":"4","B":"5","C":"6","D":"6"}'),
  ('lq4', 'loadtest-exam', 'Soal 4 x 2 = ?', 'B', 'PG', 20, '{"A":"6","B":"8","C":"10","D":"12"}'),
  ('lq5', 'loadtest-exam', 'Soal 10 / 2 = ?', 'A', 'PG', 20, '{"A":"5","B":"6","C":"7","D":"8"}');

-- 4. Bulk insert 1000 peserta (NISN: 99xxxxxx)
WITH RECURSIVE seq(n) AS (
  SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n < 1000
)
INSERT INTO eligible_participants
  (participant_id, nisn, name, rombel_name, subject_name, pembelajaran_id, semester_id, source)
SELECT
  'load-p' || printf('%04d', n),
  printf('99%06d', n),
  'Load Test User ' || n,
  'XII-' || ((n-1) % 10 + 1),
  'Load Test',
  'loadtest-exam',
  '20261',
  'SIAKAD'
FROM seq;

-- 5. Assign semua ke session
INSERT INTO participant_sessions (participant_id, session_id, status)
SELECT participant_id, 'loadtest-sess', 'ELIGIBLE'
FROM eligible_participants WHERE participant_id LIKE 'load-p%';

-- 6. Verify
SELECT COUNT(*) || ' peserta terdaftar' FROM eligible_participants WHERE pembelajaran_id = 'loadtest-exam';```

## File: ./platform/000001_init.down.sql
```
DROP TABLE IF EXISTS platform_audit_log;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS platform_users;
DROP TABLE IF EXISTS tenants;```

## File: ./platform/000001_init.up.sql
```
-- ============================================
-- PLATFORM DATABASE — Registry & Billing
-- Berisi data cross-tenant (bukan per-sekolah)
-- ============================================

CREATE TABLE IF NOT EXISTS tenants (
    tenant_id       TEXT PRIMARY KEY,           -- UUID internal
    npsn            TEXT UNIQUE NOT NULL,       -- 8 digit NPSN global unique
    subdomain       TEXT UNIQUE NOT NULL,       -- 'smkjaya' → smkjaya.ujian.pw
    school_name     TEXT NOT NULL,
    contact_email   TEXT DEFAULT '',
    contact_phone   TEXT DEFAULT '',
    address         TEXT DEFAULT '',
    is_active       INTEGER NOT NULL DEFAULT 1,
    is_suspended    INTEGER NOT NULL DEFAULT 0,
    suspended_reason TEXT DEFAULT '',
    db_path         TEXT NOT NULL,              -- relative path: 'tenants/{id}/cbt.db'
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_npsn ON tenants(npsn);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active, is_suspended);

-- Platform users (super admin, staff pusat)
CREATE TABLE IF NOT EXISTS platform_users (
    id              TEXT PRIMARY KEY,
    username        TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    full_name       TEXT DEFAULT '',
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_platform_users_username ON platform_users(username);

-- Subscription (billing)
CREATE TABLE IF NOT EXISTS subscriptions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id       TEXT NOT NULL,
    plan            TEXT NOT NULL DEFAULT 'BASIC',
    valid_from      DATETIME NOT NULL,
    valid_until     DATETIME NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 1,
    price_idr       INTEGER DEFAULT 0,
    notes           TEXT DEFAULT '',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subs_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subs_active ON subscriptions(tenant_id, is_active);

-- Audit log (platform level — siapa create/update tenant)
CREATE TABLE IF NOT EXISTS platform_audit_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id        TEXT NOT NULL,
    action          TEXT NOT NULL,
    target_type     TEXT DEFAULT '',
    target_id       TEXT DEFAULT '',
    details         TEXT DEFAULT '',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON platform_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON platform_audit_log(created_at);```

## File: ./platform/000002_add_tenant_ops_fields.sql
```
-- Tambah kolom operasional tenant
ALTER TABLE tenants ADD COLUMN package_tier TEXT DEFAULT 'BASIC';
ALTER TABLE tenants ADD COLUMN billing_type TEXT DEFAULT 'MONTHLY';
ALTER TABLE tenants ADD COLUMN max_participants INTEGER DEFAULT 500;
ALTER TABLE tenants ADD COLUMN sync_locked INTEGER NOT NULL DEFAULT 0;```
