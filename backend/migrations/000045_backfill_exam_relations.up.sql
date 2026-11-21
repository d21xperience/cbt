UPDATE exams
SET subject_id = l.subject_id,
    class_id = l.class_id,
    jenis_ujian_id = es.jenis_ujian_id
FROM exam_schedules es
JOIN lessons l ON l.id = es.lesson_id
JOIN subjects s ON s.id = l.subject_id
JOIN exam_types et ON et.id = es.jenis_ujian_id
WHERE exams.title = (s.nama || ' - ' || et.nama)
  AND exams.start_time = (es.tanggal || 'T' || es.jam_mulai || ':00+07:00')
  AND exams.academic_period_id = es.academic_period_id;
