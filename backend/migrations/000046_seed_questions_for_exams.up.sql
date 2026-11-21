-- Seed Soal untuk Ujian Koding (ef3f5b297dfbbcc20adcd926ec86dfb0)
INSERT OR IGNORE INTO questions (id, exam_id, question_text, question_type, score, options, correct_option, created_at)
VALUES
('q-kod-1', 'ef3f5b297dfbbcc20adcd926ec86dfb0', 'Apa itu variabel dalam pemrograman?', 'MULTIPLE_CHOICE', 10, '[{"id":"A","text":"Tempat menyimpan data"},{"id":"B","text":"Alat untuk mencetak"},{"id":"C","text":"Mesin kompilasi"},{"id":"D","text":"Sistem operasi"}]', 'A', datetime('now')),
('q-kod-2', 'ef3f5b297dfbbcc20adcd926ec86dfb0', 'Sebutkan tipe data untuk angka desimal!', 'MULTIPLE_CHOICE', 10, '[{"id":"A","text":"Integer"},{"id":"B","text":"Float"},{"id":"C","text":"String"},{"id":"D","text":"Boolean"}]', 'B', datetime('now')),
('q-kod-3', 'ef3f5b297dfbbcc20adcd926ec86dfb0', 'Jelaskan secara singkat apa itu AI!', 'ESSAY', 20, '[]', '', datetime('now'));

-- Seed Soal untuk Ujian B. Indo (d69d82bb918088eb5e5c993bf674e55a)
INSERT OR IGNORE INTO questions (id, exam_id, question_text, question_type, score, options, correct_option, created_at)
VALUES
('q-indo-1', 'd69d82bb918088eb5e5c993bf674e55a', 'Apa ibu kota Indonesia?', 'MULTIPLE_CHOICE', 10, '[{"id":"A","text":"Bandung"},{"id":"B","text":"Surabaya"},{"id":"C","text":"Jakarta"},{"id":"D","text":"Medan"}]', 'C', datetime('now')),
('q-indo-2', 'd69d82bb918088eb5e5c993bf674e55a', 'Sebutkan 3 pahlawan nasional Indonesia!', 'ESSAY', 20, '[]', '', datetime('now')),
('q-indo-3', 'd69d82bb918088eb5e5c993bf674e55a', 'Tuliskan sebuah puisi pendek tentang kemerdekaan.', 'ESSAY', 30, '[]', '', datetime('now'));
