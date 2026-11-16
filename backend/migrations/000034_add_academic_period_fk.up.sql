-- FASE C.0.5: FK academic_period_id ke 4 tabel temporal
-- 1. Tambah kolom
ALTER TABLE classes         ADD COLUMN academic_period_id TEXT REFERENCES academic_periods(id);
ALTER TABLE class_members   ADD COLUMN academic_period_id TEXT REFERENCES academic_periods(id);
ALTER TABLE lessons         ADD COLUMN academic_period_id TEXT REFERENCES academic_periods(id);
ALTER TABLE exam_schedules  ADD COLUMN academic_period_id TEXT REFERENCES academic_periods(id);

-- 2. Backfill dari existing (academic_year + semester string)
UPDATE classes SET academic_period_id = (
    SELECT id FROM academic_periods 
    WHERE academic_year = classes.academic_year AND semester = classes.semester LIMIT 1
) WHERE academic_period_id IS NULL;

UPDATE class_members SET academic_period_id = (
    SELECT id FROM academic_periods 
    WHERE academic_year = class_members.academic_year AND semester = class_members.semester LIMIT 1
) WHERE academic_period_id IS NULL;

UPDATE lessons SET academic_period_id = (
    SELECT id FROM academic_periods 
    WHERE academic_year = lessons.academic_year AND semester = lessons.semester LIMIT 1
) WHERE academic_period_id IS NULL;

UPDATE exam_schedules SET academic_period_id = (
    SELECT id FROM academic_periods 
    WHERE academic_year = exam_schedules.academic_year AND semester = exam_schedules.semester LIMIT 1
) WHERE academic_period_id IS NULL;

-- 3. Index untuk performa
CREATE INDEX IF NOT EXISTS idx_classes_period_fk ON classes(academic_period_id);
CREATE INDEX IF NOT EXISTS idx_class_members_period_fk ON class_members(academic_period_id);
CREATE INDEX IF NOT EXISTS idx_lessons_period_fk ON lessons(academic_period_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_period_fk ON exam_schedules(academic_period_id);
