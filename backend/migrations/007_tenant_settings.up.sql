-- ============================================
-- BASELINE 007 — TENANT SETTINGS
-- Menggabungkan: 037
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO tenant_settings (key, value) VALUES ('exam_mode', '');