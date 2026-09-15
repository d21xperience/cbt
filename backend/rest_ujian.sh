#!/bin/bash
# cd backend

# 1. Hapus hasil ujian lama
sqlite3 cbt.db "DELETE FROM exam_results WHERE participant_id = 'part-1' AND exam_id = 'test-exam';"

# 2. Reset participant session (belum mulai)
sqlite3 cbt.db "UPDATE participant_sessions SET status = 'ELIGIBLE' WHERE participant_id = 'part-1' AND session_id = 'sess-1';"

# 3. Extend session end_time ke 1 jam ke depan
sqlite3 cbt.db "UPDATE exam_sessions SET start_time = datetime('now'), end_time = datetime('now', '+1 hour'), status = 'SCHEDULED' WHERE id = 'sess-1';"

# 4. Verify
sqlite3 cbt.db "SELECT id, exam_id, start_time, end_time, status FROM exam_sessions;"
sqlite3 cbt.db "SELECT participant_id, session_id, status FROM participant_sessions;"
sqlite3 cbt.db "SELECT COUNT(*) as result_count FROM exam_results WHERE participant_id='part-1';"