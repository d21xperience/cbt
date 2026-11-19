-- Rollback
DROP INDEX IF EXISTS idx_cred_revoked;
DROP INDEX IF EXISTS idx_cred_qr_token;
-- Catatan: SQLite tidak support DROP COLUMN sebelum 3.35, jadi kita biarkan kolomnya (tidak berbahaya)
