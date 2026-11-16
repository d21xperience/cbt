-- FASE C.1.1: Ubah ID academic_periods ke format [YYYY][1|2]
-- 1 = GANJIL, 2 = GENAP
-- Contoh: 2025/2026 GANJIL → 20251

-- Update semua existing rows
UPDATE academic_periods SET id = '20251' WHERE academic_year = '2025/2026' AND semester = 'GANJIL';
UPDATE academic_periods SET id = '20252' WHERE academic_year = '2025/2026' AND semester = 'GENAP';
UPDATE academic_periods SET id = '20261' WHERE academic_year = '2026/2027' AND semester = 'GANJIL';
UPDATE academic_periods SET id = '20262' WHERE academic_year = '2026/2027' AND semester = 'GENAP';
