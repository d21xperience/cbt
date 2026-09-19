ALTER TABLE tenants ADD COLUMN pending_admin_username TEXT DEFAULT '';
UPDATE tenants SET pending_admin_username = 'admin' WHERE pending_admin_username = '';
