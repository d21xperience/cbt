-- BCR: Guru & Proctor Auth & Multi-Subject
-- Menghapus subject_id lama jika ada (opsional, kita abaikan saja agar tidak error di SQLite)
ALTER TABLE teachers ADD COLUMN email TEXT DEFAULT '';
ALTER TABLE teachers ADD COLUMN password_hash TEXT DEFAULT '';
ALTER TABLE teachers ADD COLUMN password_plain TEXT DEFAULT '';
ALTER TABLE teachers ADD COLUMN teaching_subject_ids TEXT DEFAULT '[]';
ALTER TABLE teachers ADD COLUMN is_homeroom INTEGER DEFAULT 0;
ALTER TABLE teachers ADD COLUMN homeroom_class_id TEXT DEFAULT '';
ALTER TABLE teachers ADD COLUMN has_logged_in INTEGER DEFAULT 0;
