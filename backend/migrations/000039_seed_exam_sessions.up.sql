-- Update existing exams to have valid ISO8601 times
UPDATE exams
SET start_time = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
    end_time = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+90 minutes')
WHERE start_time IS NULL OR start_time = '';

-- Insert default exam_session for any exam that doesn't have one (min 3 baris)
INSERT INTO exam_sessions (id, exam_id, session_type, start_time, end_time, semester_id, status, tenant_id)
SELECT
    'sess-' || lower(hex(randomblob(16))),
    id,
    'REGULER',
    start_time,
    end_time,
    academic_period_id,
    'SCHEDULED',
    tenant_id
FROM exams e
WHERE NOT EXISTS (
    SELECT 1 FROM exam_sessions es WHERE es.exam_id = e.id
);
