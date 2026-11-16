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
