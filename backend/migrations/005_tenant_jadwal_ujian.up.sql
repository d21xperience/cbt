-- ============================================
-- BASELINE 005 — JADWAL UJIAN
-- Menggabungkan: 028 + 029 (langsung versi final 029)
-- ============================================

CREATE TABLE IF NOT EXISTS exam_schedules (
    id                  TEXT PRIMARY KEY,
    lesson_id           TEXT NOT NULL,
    jenis_ujian_id      TEXT NOT NULL,
    tanggal             TEXT NOT NULL,
    jam_mulai           TEXT NOT NULL,
    durasi_menit        INTEGER NOT NULL,
    pengawas1_id        TEXT,
    pengawas2_id        TEXT,
    ruang_id            TEXT,
    academic_year       TEXT,
    semester            TEXT,
    academic_period_id  TEXT REFERENCES academic_periods(id),
    status              TEXT NOT NULL DEFAULT 'DRAFT',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_es_lesson          ON exam_schedules(lesson_id);
CREATE INDEX IF NOT EXISTS idx_es_tanggal         ON exam_schedules(tanggal);
CREATE INDEX IF NOT EXISTS idx_es_period_fk       ON exam_schedules(academic_period_id);