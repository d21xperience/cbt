-- Seed 3 peserta uji coba untuk Fase D.2
-- CATATAN: PasswordEnc dan PasswordIV di sini adalah placeholder. 
-- Setelah apply, Admin HARUS klik "Reset Password" di UI untuk 3 NISN ini 
-- agar ciphertext menjadi valid dan bisa didekripsi oleh crypto.Cipher.

INSERT OR IGNORE INTO participant_credentials (nisn, username, password_enc, password_iv, is_active, tenant_id, generated_at, generated_by)
VALUES 
    ('99000001', '99000001', X'00', X'00', 1, 'default', CURRENT_TIMESTAMP, 'seed_d2'),
    ('99000002', '99000002', X'00', X'00', 1, 'default', CURRENT_TIMESTAMP, 'seed_d2'),
    ('99000003', '99000003', X'00', X'00', 1, 'default', CURRENT_TIMESTAMP, 'seed_d2');
