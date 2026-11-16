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
