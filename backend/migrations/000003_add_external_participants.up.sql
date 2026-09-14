ALTER TABLE eligible_participants ADD COLUMN source TEXT DEFAULT 'SIAKAD'; -- 'SIAKAD' atau 'EXTERNAL'
ALTER TABLE eligible_participants ADD COLUMN external_school TEXT;         -- Nama sekolah/instansi asal (untuk eksternal)
ALTER TABLE eligible_participants ADD COLUMN external_class TEXT;          -- Kelas/rombel asal (untuk eksternal)
ALTER TABLE eligible_participants ADD COLUMN exam_id TEXT;                 -- Langsung bind ke exam_id (untuk eksternal)

CREATE INDEX IF NOT EXISTS idx_eligible_external_exam ON eligible_participants(exam_id, source);
-- 2. Membuat tabel khusus untuk import massal eksternal (Opsional, tapi bagus untuk audit)
CREATE TABLE IF NOT EXISTS external_import_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,          -- UUID batch import
    exam_id TEXT NOT NULL,
    total_records INTEGER,
    success_count INTEGER,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);