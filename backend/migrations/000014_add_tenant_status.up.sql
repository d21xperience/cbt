-- ============================================
-- Add status column + onboarding fields to tenants
-- ============================================

-- 1. Add status column (nullable first, will be backfilled)
ALTER TABLE tenants ADD COLUMN status TEXT;

-- 2. Backfill existing rows
UPDATE tenants SET status = CASE
    WHEN is_active = 1 THEN 'ACTIVE'
    ELSE 'INACTIVE'
END;

-- 3. Onboarding support columns
ALTER TABLE tenants ADD COLUMN approved_at DATETIME;
ALTER TABLE tenants ADD COLUMN approved_by TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN rejected_reason TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN logo_url TEXT DEFAULT '';

-- 4. Index for pending queue
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_status_suspended ON tenants(status, is_suspended);