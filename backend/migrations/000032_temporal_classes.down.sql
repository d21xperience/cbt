DROP TABLE IF EXISTS rollover_logs;
DROP INDEX IF EXISTS idx_classes_period;
ALTER TABLE classes DROP COLUMN semester;
ALTER TABLE classes DROP COLUMN academic_year;
