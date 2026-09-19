-- SQLite (pre-3.35) doesn't support DROP COLUMN. Safe to leave.
-- If needed to rollback: recreate table without columns.
SELECT 1;