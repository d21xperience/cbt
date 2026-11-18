INSERT INTO exams (id, title, duration_minutes, start_time, end_time, tenant_id, academic_period_id)
SELECT lower(hex(randomblob(16))), s.nama || ' - ' || et.nama, es.durasi_menit,
       es.tanggal || 'T' || es.jam_mulai || ':00Z',
       strftime('%Y-%m-%dT%H:%M:%SZ', datetime(es.tanggal || ' ' || es.jam_mulai, '+' || es.durasi_menit || ' minutes')),
       'default', es.academic_period_id
FROM exam_schedules es
JOIN lessons l ON l.id = es.lesson_id
JOIN subjects s ON s.id = l.subject_id
JOIN exam_types et ON et.id = es.jenis_ujian_id
WHERE NOT EXISTS (SELECT 1 FROM exams e WHERE e.title = (s.nama || ' - ' || et.nama) AND e.start_time = (es.tanggal || 'T' || es.jam_mulai || ':00Z'));

INSERT INTO exam_sessions (id, exam_id, session_type, start_time, end_time, semester_id, status, tenant_id)
SELECT lower(hex(randomblob(16))), e.id, 'REGULER', e.start_time, e.end_time, e.academic_period_id, 'SCHEDULED', e.tenant_id
FROM exams e WHERE NOT EXISTS (SELECT 1 FROM exam_sessions sess WHERE sess.exam_id = e.id);

INSERT OR IGNORE INTO participant_sessions (participant_id, session_id, status, tenant_id)
SELECT cm.siswa_id, sess.id, 'ELIGIBLE', sess.tenant_id
FROM class_members cm
JOIN exam_sessions sess ON sess.semester_id = cm.academic_period_id
JOIN exams e ON e.id = sess.exam_id
JOIN lessons l ON l.class_id = cm.class_id
JOIN subjects s ON s.id = l.subject_id
WHERE cm.is_active = 1 AND cm.academic_period_id = sess.semester_id;
