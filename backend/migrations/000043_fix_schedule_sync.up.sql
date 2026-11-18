-- 1. Fix Timezone: Ubah format 'Z' (UTC) menjadi '+07:00' (WIB) di tabel exams dan exam_sessions
UPDATE exams 
SET start_time = replace(start_time, 'Z', '+07:00'),
    end_time = replace(end_time, 'Z', '+07:00')
WHERE start_time LIKE '%Z';

UPDATE exam_sessions 
SET start_time = replace(start_time, 'Z', '+07:00'),
    end_time = replace(end_time, 'Z', '+07:00')
WHERE start_time LIKE '%Z';

-- 2. Hapus participant_sessions yang salah kelas (Cartesian Product)
-- (Siswa hanya boleh terhubung ke sesi ujian dari mapel yang dia ambil di kelasnya)
DELETE FROM participant_sessions 
WHERE participant_id NOT IN (
    SELECT cm.siswa_id 
    FROM class_members cm
    JOIN lessons l ON l.class_id = cm.class_id
    JOIN exam_schedules es ON es.lesson_id = l.id
    JOIN exams e ON e.title = (SELECT s.nama FROM subjects s WHERE s.id = l.subject_id) || ' - ' || (SELECT nama FROM exam_types et WHERE et.id = es.jenis_ujian_id)
);

-- 3. Assign ulang secara ketat berdasarkan Kelas & Lesson ID (menggunakan jembatan mata pelajaran)
-- (Hati-hati: SQL ini memastikan hanya siswa di kelas terkait yang mendapat jadwal)
INSERT OR IGNORE INTO participant_sessions (participant_id, session_id, status, tenant_id)
SELECT cm.siswa_id, sess.id, 'ELIGIBLE', sess.tenant_id
FROM class_members cm
JOIN lessons l ON l.class_id = cm.class_id
JOIN subjects s ON s.id = l.subject_id
JOIN exam_schedules es ON es.lesson_id = l.id
JOIN exams e ON e.title = (s.nama || ' - ' || (SELECT nama FROM exam_types et WHERE et.id = es.jenis_ujian_id))
JOIN exam_sessions sess ON sess.exam_id = e.id
WHERE cm.is_active = 1;
