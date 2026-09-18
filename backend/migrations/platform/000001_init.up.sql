-- ============================================
-- PLATFORM DATABASE — Registry & Billing
-- Berisi data cross-tenant (bukan per-sekolah)
-- ============================================

CREATE TABLE IF NOT EXISTS tenants (
    tenant_id       TEXT PRIMARY KEY,           -- UUID internal
    npsn            TEXT UNIQUE NOT NULL,       -- 8 digit NPSN global unique
    subdomain       TEXT UNIQUE NOT NULL,       -- 'smkjaya' → smkjaya.ujian.pw
    school_name     TEXT NOT NULL,
    contact_email   TEXT DEFAULT '',
    contact_phone   TEXT DEFAULT '',
    address         TEXT DEFAULT '',
    is_active       INTEGER NOT NULL DEFAULT 1,
    is_suspended    INTEGER NOT NULL DEFAULT 0,
    suspended_reason TEXT DEFAULT '',
    db_path         TEXT NOT NULL,              -- relative path: 'tenants/{id}/cbt.db'
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_npsn ON tenants(npsn);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active, is_suspended);

-- Platform users (super admin, staff pusat)
CREATE TABLE IF NOT EXISTS platform_users (
    id              TEXT PRIMARY KEY,
    username        TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    full_name       TEXT DEFAULT '',
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_platform_users_username ON platform_users(username);

-- Subscription (billing)
CREATE TABLE IF NOT EXISTS subscriptions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id       TEXT NOT NULL,
    plan            TEXT NOT NULL DEFAULT 'BASIC',
    valid_from      DATETIME NOT NULL,
    valid_until     DATETIME NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 1,
    price_idr       INTEGER DEFAULT 0,
    notes           TEXT DEFAULT '',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subs_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subs_active ON subscriptions(tenant_id, is_active);

-- Audit log (platform level — siapa create/update tenant)
CREATE TABLE IF NOT EXISTS platform_audit_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id        TEXT NOT NULL,
    action          TEXT NOT NULL,
    target_type     TEXT DEFAULT '',
    target_id       TEXT DEFAULT '',
    details         TEXT DEFAULT '',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON platform_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON platform_audit_log(created_at);