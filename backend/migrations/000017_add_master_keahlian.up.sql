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
    ('prog-dkv',     'SENI',    'DKV',  'Desain Komunikasi Visual',          0, 1);