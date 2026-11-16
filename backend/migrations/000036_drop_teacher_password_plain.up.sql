-- ⚠️ JANGAN jalankan sebelum backfill verified (semua row punya password_enc+iv)
ALTER TABLE teachers DROP COLUMN password_plain;
