-- 1. Bersihkan tabel participant_sessions dari data hasil sinkronisasi yang salah
DELETE FROM participant_sessions;

-- 2. Assign ulang secara presisi (Siswa HANYA mendapat jadwal jika kelasnya cocok dengan lesson)
INSERT OR IGNORE INTO participant_sessions (participant_id, session_id, status, tenant_id)
SELECT cm.siswa_id, sess.id, 'ELIGIBLE', sess.tenant_id
FROM class_members cm
JOIN lessons l ON l.class_id = cm.class_id
JOIN exam_schedules es ON es.lesson_id = l.id
JOIN subjects s ON s.id = l.subject_id
JOIN exam_types et ON et.id = es.jenis_ujian_id
JOIN exams e ON e.title = (s.nama || ' - ' || et.nama)
JOIN exam_sessions sess ON sess.exam_id = e.id
WHERE cm.is_active = 1;
