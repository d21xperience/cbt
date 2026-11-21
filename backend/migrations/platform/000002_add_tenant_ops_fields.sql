-- Tambah kolom operasional tenant
ALTER TABLE tenants ADD COLUMN package_tier TEXT DEFAULT 'BASIC';
ALTER TABLE tenants ADD COLUMN billing_type TEXT DEFAULT 'MONTHLY';
ALTER TABLE tenants ADD COLUMN max_participants INTEGER DEFAULT 500;
ALTER TABLE tenants ADD COLUMN sync_locked INTEGER NOT NULL DEFAULT 0;