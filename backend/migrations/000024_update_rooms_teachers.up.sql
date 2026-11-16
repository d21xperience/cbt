-- Sesuaikan Rooms dengan FE (gedung) & Teachers dengan FE (username, homeroom)
ALTER TABLE rooms RENAME COLUMN lokasi TO gedung;
ALTER TABLE teachers ADD COLUMN username TEXT DEFAULT '';
ALTER TABLE teachers ADD COLUMN homeroom_class_nama TEXT DEFAULT '';
ALTER TABLE teachers ADD COLUMN subject_id TEXT DEFAULT '';
