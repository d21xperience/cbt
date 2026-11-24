-- ============================================
-- BASELINE 004 — EXAM CORE (per-tenant DB)
-- Menggabungkan: 001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 040
-- ⚠️ FIX: exams memiliki academic_period_id, subject_id, class_id, jenis_ujian_id
--         (kolom yang hilang di migration asli — bug 042/045)
-- ============================================

-- ----- EXAMS (001 + 012 + fix) -----
CREATE TABLE IF NOT EXISTS exams (
    id                  TEXT PRIMARY KEY,
    title               TEXT NOT NULL,
    duration_minutes    INTEGER NOT NULL,
    start_time          TEXT NOT NULL,
    end_time            TEXT NOT NULL,
    subject_id          TEXT,
    class_id            TEXT,
    jenis_ujian_id      TEXT,
    academic_period_id  TEXT,
    tenant_id           TEXT NOT NULL DEFAULT 'default',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_exams_tenant            ON exams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exams_subject           ON exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_exams_class             ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_jenis             ON exams(jenis_ujian_id);
CREATE INDEX IF NOT EXISTS idx_exams_period            ON exams(academic_period_id);

-- ----- QUESTIONS (001 + 004 + 007 + 012) -----
CREATE TABLE IF NOT EXISTS questions (
    id              TEXT PRIMARY KEY,
    exam_id         TEXT NOT NULL,
    question_text   TEXT NOT NULL,
    media_url       TEXT,
    correct_option  TEXT,
    options         TEXT DEFAULT '{}',
    question_type   TEXT DEFAULT 'PG',
    score           REAL DEFAULT 10,
    rubric          TEXT,
    tenant_id       TEXT NOT NULL DEFAULT 'default',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id       ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_type          ON questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_tenant        ON questions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_questions_tenant_exam   ON questions(tenant_id, exam_id);

-- ----- EXAM RESULTS (001 + 002 + 012) -----
CREATE TABLE IF NOT EXISTS exam_results (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id   TEXT NOT NULL,
    exam_id          TEXT NOT NULL,
    total_questions  INTEGER NOT NULL,
    correct_answers  INTEGER NOT NULL,
    final_score      REAL NOT NULL,
    status           TEXT DEFAULT 'SUBMITTED',
    submitted_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_type     TEXT DEFAULT 'REGULER',
    tenant_id        TEXT NOT NULL DEFAULT 'default',
    UNIQUE(participant_id, exam_id)
);
CREATE INDEX IF NOT EXISTS idx_results_participant       ON exam_results(participant_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_tenant       ON exam_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_tenant_exam  ON exam_results(tenant_id, exam_id);

-- ----- EXTERNAL IMPORT LOGS (003) -----
CREATE TABLE IF NOT EXISTS external_import_logs (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id       TEXT NOT NULL,
    exam_id        TEXT NOT NULL,
    total_records  INTEGER,
    success_count  INTEGER,
    imported_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ----- ESSAY SCORES (006) -----
CREATE TABLE IF NOT EXISTS essay_scores (
    participant_id  TEXT NOT NULL,
    exam_id         TEXT NOT NULL,
    question_id     TEXT NOT NULL,
    score           REAL NOT NULL,
    graded_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(participant_id, exam_id, question_id)
);

-- ----- EXAM SESSIONS (002 + 007 + 012) -----
CREATE TABLE IF NOT EXISTS exam_sessions (
    id            TEXT PRIMARY KEY,
    exam_id       TEXT NOT NULL,
    session_type  TEXT NOT NULL,
    start_time    DATETIME NOT NULL,
    end_time      DATETIME NOT NULL,
    semester_id   TEXT NOT NULL DEFAULT '00000',
    status        TEXT NOT NULL DEFAULT 'SCHEDULED',
    tenant_id     TEXT NOT NULL DEFAULT 'default',
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_exam         ON exam_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_sessions_semester     ON exam_sessions(semester_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_tenant  ON exam_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_tenant_exam ON exam_sessions(tenant_id, exam_id);

-- ----- PARTICIPANT SESSIONS (002 + 011 + 012) -----
CREATE TABLE IF NOT EXISTS participant_sessions (
    participant_id        TEXT NOT NULL,
    session_id            TEXT NOT NULL,
    status                TEXT NOT NULL DEFAULT 'ELIGIBLE',
    attendance_status     TEXT DEFAULT 'PENDING',
    is_makeup             INTEGER DEFAULT 0,
    makeup_reason         TEXT,
    makeup_approved_by    TEXT,
    makeup_approved_at    DATETIME,
    tenant_id             TEXT NOT NULL DEFAULT 'default',
    PRIMARY KEY(participant_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_part_sess_status     ON participant_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ps_attendance        ON participant_sessions(attendance_status);
CREATE INDEX IF NOT EXISTS idx_ps_is_makeup         ON participant_sessions(is_makeup) WHERE is_makeup = 1;
CREATE INDEX IF NOT EXISTS idx_part_sessions_tenant ON participant_sessions(tenant_id);

-- ----- PAYMENT GATES (011 + 012) -----
-- Catatan: kolom `tenant_id` dipertahankan untuk konsistensi dengan tabel tenant lain.
-- Di masa depan, payment_gates juga akan dipakai di platform DB (billing SaaS).
CREATE TABLE IF NOT EXISTS payment_gates (
    nisn            TEXT PRIMARY KEY,
    is_blocked      INTEGER NOT NULL DEFAULT 0,
    reason          TEXT,
    source          TEXT DEFAULT 'MANUAL',
    blocked_by      TEXT,
    blocked_at      DATETIME,
    unblocked_by    TEXT,
    unblocked_at    DATETIME,
    note            TEXT,
    tenant_id       TEXT NOT NULL DEFAULT 'default'
);
CREATE INDEX IF NOT EXISTS idx_payment_gates_blocked ON payment_gates(is_blocked) WHERE is_blocked = 1;
CREATE INDEX IF NOT EXISTS idx_payment_tenant        ON payment_gates(tenant_id);

-- ----- EXAM TOKENS (009) -----
CREATE TABLE IF NOT EXISTS exam_tokens (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL,
    token         TEXT NOT NULL,
    valid_from    DATETIME NOT NULL,
    valid_until   DATETIME NOT NULL,
    is_active     INTEGER NOT NULL DEFAULT 1,
    generated_by  TEXT,
    generated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_exam_tokens_session ON exam_tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_exam_tokens_active  ON exam_tokens(session_id, is_active);

-- ----- ELIGIBLE PARTICIPANTS (001 + 003 + 012) -----
CREATE TABLE IF NOT EXISTS eligible_participants (
    participant_id   TEXT PRIMARY KEY,
    nisn             TEXT NOT NULL,
    name             TEXT NOT NULL,
    rombel_name      TEXT NOT NULL,
    subject_name     TEXT NOT NULL,
    pembelajaran_id  TEXT NOT NULL,
    semester_id      TEXT NOT NULL,
    source           TEXT DEFAULT 'SIAKAD',
    external_school  TEXT,
    external_class   TEXT,
    exam_id          TEXT,
    tenant_id        TEXT NOT NULL DEFAULT 'default',
    synced_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_eligible_nisn              ON eligible_participants(nisn);
CREATE INDEX IF NOT EXISTS idx_eligible_pembelajaran      ON eligible_participants(pembelajaran_id);
CREATE INDEX IF NOT EXISTS idx_eligible_external_exam     ON eligible_participants(exam_id, source);
CREATE INDEX IF NOT EXISTS idx_eligible_tenant            ON eligible_participants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eligible_tenant_nisn       ON eligible_participants(tenant_id, nisn);