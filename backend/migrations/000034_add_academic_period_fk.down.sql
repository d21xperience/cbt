DROP INDEX IF EXISTS idx_exam_schedules_period_fk;
DROP INDEX IF EXISTS idx_lessons_period_fk;
DROP INDEX IF EXISTS idx_class_members_period_fk;
DROP INDEX IF EXISTS idx_classes_period_fk;
ALTER TABLE exam_schedules DROP COLUMN academic_period_id;
ALTER TABLE lessons DROP COLUMN academic_period_id;
ALTER TABLE class_members DROP COLUMN academic_period_id;
ALTER TABLE classes DROP COLUMN academic_period_id;
