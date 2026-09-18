-- ============================================
-- PHASE 2A: Add tenant_id to all tenant-level tables
-- Default 'default' untuk existing rows (backward compatible)
-- ============================================

-- 1. exam_results
ALTER TABLE exam_results ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_exam_results_tenant ON exam_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_tenant_exam ON exam_results(tenant_id, exam_id);

-- 2. exam_sessions
ALTER TABLE exam_sessions ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_exam_sessions_tenant ON exam_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_tenant_exam ON exam_sessions(tenant_id, exam_id);

-- 3. participant_sessions
ALTER TABLE participant_sessions ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_part_sessions_tenant ON participant_sessions(tenant_id);

-- 4. eligible_participants
ALTER TABLE eligible_participants ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_eligible_tenant ON eligible_participants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eligible_tenant_nisn ON eligible_participants(tenant_id, nisn);

-- 5. questions
ALTER TABLE questions ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_questions_tenant ON questions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_questions_tenant_exam ON questions(tenant_id, exam_id);

-- 6. exams
ALTER TABLE exams ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_exams_tenant ON exams(tenant_id);

-- 7. participant_credentials
ALTER TABLE participant_credentials ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_cred_tenant ON participant_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cred_tenant_username ON participant_credentials(tenant_id, username);

-- 8. payment_gates
ALTER TABLE payment_gates ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_payment_tenant ON payment_gates(tenant_id);

-- 9. exam_tokens (kalau ada — cek dulu sebelum apply)
-- Karena exam_tokens.session_id FK ke exam_sessions yang punya tenant_id,
-- mungkin tidak perlu tenant_id langsung. Skip dulu, cek nanti.

-- 10. proctor_assignments (FK ke proctor_id dan session_id)
-- Idem, tidak perlu tenant_id langsung. Skip.

-- ============================================
-- Verify: semua existing row jadi tenant='default'
-- ============================================