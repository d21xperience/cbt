-- ============================================
-- Add jenjang + program_duration_years to tenants
-- VER-007 — jenjang adalah atribut tenant
-- ============================================

ALTER TABLE tenants ADD COLUMN jenjang TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN program_duration_years INTEGER DEFAULT 3;

-- Backfill existing tenants (default: SMA 3 tahun)
UPDATE tenants SET jenjang = 'SMA' WHERE jenjang = '' OR jenjang IS NULL;
UPDATE tenants SET program_duration_years = 3 WHERE program_duration_years IS NULL OR program_duration_years = 0;

CREATE INDEX IF NOT EXISTS idx_tenants_jenjang ON tenants(jenjang);