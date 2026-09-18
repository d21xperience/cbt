-- ============================================
-- LOAD TEST SEED — 1000 peserta
-- ============================================

-- Hapus data load test lama (idempotent)
DELETE FROM participant_credentials WHERE nisn LIKE '99%' AND nisn > '999999';
DELETE FROM participant_sessions WHERE participant_id LIKE 'load-p%';
DELETE FROM eligible_participants WHERE participant_id LIKE 'load-p%';
DELETE FROM exam_results WHERE exam_id = 'loadtest-exam';
DELETE FROM questions WHERE exam_id = 'loadtest-exam';
DELETE FROM exam_sessions WHERE exam_id = 'loadtest-exam';
DELETE FROM exams WHERE id = 'loadtest-exam';

-- 1. Buat exam
INSERT INTO exams (id, title, duration_minutes, start_time, end_time)
VALUES ('loadtest-exam', 'Load Test Exam', 60,
        datetime('now'), datetime('now', '+2 hours'));

-- 2. Buat session (aktif sekarang - 2 jam)
INSERT INTO exam_sessions (id, exam_id, session_type, start_time, end_time, status, semester_id)
VALUES ('loadtest-sess', 'loadtest-exam', 'REGULER',
        datetime('now', '-5 minutes'), datetime('now', '+2 hours'),
        'SCHEDULED', '20261');

-- 3. Buat 5 soal (simple PG)
INSERT INTO questions (id, exam_id, question_text, correct_option, question_type, score, options)
VALUES
  ('lq1', 'loadtest-exam', 'Soal 1 + 1 = ?', 'A', 'PG', 20, '{"A":"2","B":"3","C":"4","D":"5"}'),
  ('lq2', 'loadtest-exam', 'Soal 2 + 2 = ?', 'C', 'PG', 20, '{"A":"2","B":"3","C":"4","D":"5"}'),
  ('lq3', 'loadtest-exam', 'Soal 3 + 3 = ?', 'D', 'PG', 20, '{"A":"4","B":"5","C":"6","D":"6"}'),
  ('lq4', 'loadtest-exam', 'Soal 4 x 2 = ?', 'B', 'PG', 20, '{"A":"6","B":"8","C":"10","D":"12"}'),
  ('lq5', 'loadtest-exam', 'Soal 10 / 2 = ?', 'A', 'PG', 20, '{"A":"5","B":"6","C":"7","D":"8"}');

-- 4. Bulk insert 1000 peserta (NISN: 99xxxxxx)
WITH RECURSIVE seq(n) AS (
  SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n < 1000
)
INSERT INTO eligible_participants
  (participant_id, nisn, name, rombel_name, subject_name, pembelajaran_id, semester_id, source)
SELECT
  'load-p' || printf('%04d', n),
  printf('99%06d', n),
  'Load Test User ' || n,
  'XII-' || ((n-1) % 10 + 1),
  'Load Test',
  'loadtest-exam',
  '20261',
  'SIAKAD'
FROM seq;

-- 5. Assign semua ke session
INSERT INTO participant_sessions (participant_id, session_id, status)
SELECT participant_id, 'loadtest-sess', 'ELIGIBLE'
FROM eligible_participants WHERE participant_id LIKE 'load-p%';

-- 6. Verify
SELECT COUNT(*) || ' peserta terdaftar' FROM eligible_participants WHERE pembelajaran_id = 'loadtest-exam';