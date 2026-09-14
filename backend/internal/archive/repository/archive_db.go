package repository

import (
	"cbt-engine-service/internal/archive/domain"
	"database/sql"
	"log"
)

type ArchiveDB struct {
	DB *sql.DB
}

func NewArchiveDB(db *sql.DB) *ArchiveDB {
	return &ArchiveDB{DB: db}
}

// GetAllSemesterResults mengambil semua hasil ujian untuk di-export
func (r *ArchiveDB) GetAllSemesterResults() ([]domain.ExamResult, error) {
	query := `
		SELECT er.participant_id, ep.nisn, ep.name, er.exam_id, er.session_type, 
			   er.total_questions, er.correct_answers, er.final_score, er.submitted_at
		FROM exam_results er
		JOIN eligible_participants ep ON er.participant_id = ep.participant_id
	`
	rows, err := r.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []domain.ExamResult
	for rows.Next() {
		var res domain.ExamResult
		// Scan data... (disesuaikan dengan field)
		results = append(results, res)
	}
	return results, nil
}

// ResetSemesterData Menghapus semua data transaksional dan mengecilkan file DB
func (r *ArchiveDB) ResetSemesterData() error {
	log.Println("[ARCHIVE] Memulai proses Reset Database (Wipe & VACUUM)...")

	// Gunakan Transaction untuk keamanan data
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}

	// Hapus semua tabel transaksional (JANGAN hapus tabel master soal jika ingin dipakai lagi,
	// tapi jika ingin benar-benar fresh, hapus juga tabel questions/exam_sessions)
	tablesToWipe := []string{
		"exam_results",
		"participant_sessions",
		"exam_sessions",
		"eligible_participants",
	}

	for _, table := range tablesToWipe {
		if _, err := tx.Exec("DELETE FROM " + table); err != nil {
			tx.Rollback()
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	// PENTING: VACUUM untuk reclaim disk space di SQLite agar file cbt.db kembali kecil
	if _, err := r.DB.Exec("VACUUM"); err != nil {
		log.Printf("[ARCHIVE] Peringatan: Gagal VACUUM: %v", err)
	}

	log.Println("[ARCHIVE] Database berhasil di-reset dan di-VACUUM.")
	return nil
}

func (r *ArchiveDB) ResetExamData(semesterID string) error {
	log.Printf("[ARCHIVE-L1] Memulai pembersihan data transaksional untuk semester %s...", semesterID)

	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}

	// Hapus hasil ujian, sesi peserta, dan sesi ujian berdasarkan semester
	queries := []string{
		`DELETE FROM exam_results WHERE exam_id IN (SELECT id FROM exam_sessions WHERE semester_id = ?)`,
		`DELETE FROM participant_sessions WHERE session_id IN (SELECT id FROM exam_sessions WHERE semester_id = ?)`,
		`DELETE FROM exam_sessions WHERE semester_id = ?`,
	}

	for _, q := range queries {
		if _, err := tx.Exec(q, semesterID); err != nil {
			tx.Rollback()
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	log.Printf("[ARCHIVE-L1] Pembersihan transaksional semester %s selesai.", semesterID)
	return nil
}

// ResetAllData (LEVEL 2) - Dipanggil saat Akhir Tahun Ajaran (Naik Kelas)
// Menghapus SEMUA data dan melakukan VACUUM.
func (r *ArchiveDB) ResetAllData() error {
	log.Println("[ARCHIVE-L2] Memulai pembersihan TOTAL (Akhir Tahun Ajaran)...")

	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}

	// Hapus semua tabel transaksional DAN master data CBT
	tablesToWipe := []string{
		"exam_results",
		"participant_sessions",
		"exam_sessions",
		"eligible_participants", // Hapus daftar siswa lama
		"questions",             // Hapus bank soal lama (jika di-upload ulang tiap tahun)
	}

	for _, table := range tablesToWipe {
		if _, err := tx.Exec("DELETE FROM " + table); err != nil {
			tx.Rollback()
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	// PENTING: VACUUM untuk reclaim disk space di SQLite
	if _, err := r.DB.Exec("VACUUM"); err != nil {
		log.Printf("[ARCHIVE-L2] Peringatan: Gagal VACUUM: %v", err)
	}

	log.Println("[ARCHIVE-L2] Database berhasil di-reset TOTAL dan di-VACUUM. Sistem siap untuk tahun ajaran baru.")
	return nil
}
