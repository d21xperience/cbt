-- Tambah kolom untuk state kartu (QR, Device, Revoke)
ALTER TABLE participant_credentials ADD COLUMN qr_token TEXT;
ALTER TABLE participant_credentials ADD COLUMN device_fingerprint TEXT;
ALTER TABLE participant_credentials ADD COLUMN is_revoked INTEGER DEFAULT 0;

-- Index untuk lookup QR token yang cepat
CREATE INDEX IF NOT EXISTS idx_cred_qr_token ON participant_credentials(qr_token);
CREATE INDEX IF NOT EXISTS idx_cred_revoked ON participant_credentials(is_revoked);
