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
