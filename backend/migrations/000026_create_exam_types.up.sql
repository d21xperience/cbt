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
