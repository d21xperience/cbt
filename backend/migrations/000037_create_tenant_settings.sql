-- 000037_create_tenant_settings.sql
-- Tabel untuk menyimpan status global per-tenant (Exam Mode, dll)

CREATE TABLE IF NOT EXISTS tenant_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default value: Exam mode mati
INSERT OR IGNORE INTO tenant_settings (key, value) VALUES ('exam_mode', '');
