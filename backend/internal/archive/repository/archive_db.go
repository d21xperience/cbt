package repository

import (
	"context"
	"database/sql"
	"fmt"
	"log"

	"cbt-engine-service/internal/archive/domain"
)

type ArchiveDB struct {
	DB *sql.DB
}

func NewArchiveDB(db *sql.DB) *ArchiveDB {
	return &ArchiveDB{DB: db}
}

// GetAllSemesterResults — ambil hasil ujian untuk di-export (TENANT-SCOPED)
func (r *ArchiveDB) GetAllSemesterResults(ctx context.Context, tenantID, semesterID string) ([]domain.ExamResult, error) {
	if tenantID == "" {
		return nil, fmt.Errorf("tenant_id wajib")
	}

	// Phase 2A: filter by tenant_id + semester (kalau ada)
	// Untuk sekarang semester filter opsional
	var (
		query string
		args  []any
	)

	if semesterID != "" {
		query = `
			SELECT er.participant_id, ep.nisn, ep.name, er.exam_id, er.session_type,
			       er.total_questions, er.correct_answers, er.final_score, er.submitted_at
			FROM exam_results er
			JOIN eligible_participants ep ON er.participant_id = ep.participant_id
			WHERE er.tenant_id = ?
			  AND er.exam_id IN (
			      SELECT id FROM exam_sessions 
			      WHERE tenant_id = ? AND semester_id = ?
			  )
		`
		args = []any{tenantID, tenantID, semesterID}
	} else {
		query = `
			SELECT er.participant_id, ep.nisn, ep.name, er.exam_id, er.session_type,
			       er.total_questions, er.correct_answers, er.final_score, er.submitted_at
			FROM exam_results er
			JOIN eligible_participants ep ON er.participant_id = ep.participant_id
			WHERE er.tenant_id = ? AND ep.tenant_id = ?
		`
		args = []any{tenantID, tenantID}
	}

	rows, err := r.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("archive query: %w", err)
	}
	defer rows.Close()

	var results []domain.ExamResult
	for rows.Next() {
		var res domain.ExamResult
		// Scan sesuai field domain
		if err := rows.Scan(
			&res.ParticipantID, &res.NISN, &res.Name, &res.ExamID, &res.SessionType,
			&res.TotalQuestions, &res.CorrectAnswers, &res.FinalScore, &res.SubmittedAt,
		); err != nil {
			return nil, fmt.Errorf("scan archive: %w", err)
		}
		results = append(results, res)
	}
	return results, rows.Err()
}

// ResetSemesterData — HAPUS data transaksional (TENANT-SCOPED)
// Fixed: sebelumnya `DELETE FROM table` tanpa WHERE → wipe semua tenant
func (r *ArchiveDB) ResetSemesterData(ctx context.Context, tenantID string) error {
	if tenantID == "" {
		return fmt.Errorf("tenant_id wajib")
	}

	log.Printf("[ARCHIVE] Reset semester data untuk tenant=%s", tenantID)

	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Phase 2A: tenant-scoped delete
	// CATATAN: Tabel-tabel ini adalah transactional data (aman di-reset)
	tablesToWipe := []string{
		"exam_results",
		"participant_sessions",
		"exam_sessions",
		"eligible_participants",
	}

	for _, table := range tablesToWipe {
		// Parameterized query — tenant_id pasti dari server context
		q := fmt.Sprintf("DELETE FROM %s WHERE tenant_id = ?", table)
		if _, err := tx.ExecContext(ctx, q, tenantID); err != nil {
			return fmt.Errorf("wipe %s: %w", table, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	// VACUUM (di luar transaction)
	if _, err := r.DB.ExecContext(ctx, "VACUUM"); err != nil {
		log.Printf("[ARCHIVE] VACUUM warning: %v", err)
	}

	log.Printf("[ARCHIVE] Reset semester selesai untuk tenant=%s", tenantID)
	return nil
}

// ResetExamData — HAPUS data by semester (TENANT-SCOPED)
// Fixed: tambah tenant_id filter untuk cegah cross-tenant delete
func (r *ArchiveDB) ResetExamData(ctx context.Context, tenantID, semesterID string) error {
	if tenantID == "" {
		return fmt.Errorf("tenant_id wajib")
	}
	if semesterID == "" {
		return fmt.Errorf("semester_id wajib")
	}

	log.Printf("[ARCHIVE-L1] Reset transaksional tenant=%s semester=%s", tenantID, semesterID)

	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Tenant-scoped queries
	queries := []struct {
		q    string
		args []any
	}{
		{
			q: `DELETE FROM exam_results WHERE tenant_id = ? AND exam_id IN (
			       SELECT id FROM exam_sessions WHERE tenant_id = ? AND semester_id = ?
			    )`,
			args: []any{tenantID, tenantID, semesterID},
		},
		{
			q: `DELETE FROM participant_sessions WHERE tenant_id = ? AND session_id IN (
			       SELECT id FROM exam_sessions WHERE tenant_id = ? AND semester_id = ?
			    )`,
			args: []any{tenantID, tenantID, semesterID},
		},
		{
			q:    `DELETE FROM exam_sessions WHERE tenant_id = ? AND semester_id = ?`,
			args: []any{tenantID, semesterID},
		},
	}

	for _, item := range queries {
		if _, err := tx.ExecContext(ctx, item.q, item.args...); err != nil {
			return fmt.Errorf("reset exam data: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	log.Printf("[ARCHIVE-L1] Selesai untuk tenant=%s", tenantID)
	return nil
}

// ResetAllData — HAPUS semua data tenant (TENANT-SCOPED)
// Fixed: tambah WHERE tenant_id = ?
func (r *ArchiveDB) ResetAllData(ctx context.Context, tenantID string) error {
	if tenantID == "" {
		return fmt.Errorf("tenant_id wajib")
	}

	log.Printf("[ARCHIVE-L2] Reset ALL data tenant=%s", tenantID)

	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	tablesToWipe := []string{
		"exam_results",
		"participant_sessions",
		"exam_sessions",
		"eligible_participants",
		"questions",
	}

	for _, table := range tablesToWipe {
		q := fmt.Sprintf("DELETE FROM %s WHERE tenant_id = ?", table)
		if _, err := tx.ExecContext(ctx, q, tenantID); err != nil {
			return fmt.Errorf("wipe %s: %w", table, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	if _, err := r.DB.ExecContext(ctx, "VACUUM"); err != nil {
		log.Printf("[ARCHIVE-L2] VACUUM warning: %v", err)
	}

	log.Printf("[ARCHIVE-L2] Reset total selesai untuk tenant=%s", tenantID)
	return nil
}

// ============================================
// COMPAT WRAPPER — untuk backward compat
// Akan dihapus di Phase 3 setelah semua caller updated
// ============================================

// DeprecatedResetSemesterData — wrapper tanpa ctx/tenantID
// JANGAN dipakai untuk multi-tenant. Untuk test legacy saja.
func (r *ArchiveDB) DeprecatedResetSemesterData() error {
	log.Println("[ARCHIVE] ⚠️  DEPRECATED wrapper dipanggil — using 'default' tenant")
	return r.ResetSemesterData(context.Background(), "default")
}

// DeprecatedResetAllData — wrapper
func (r *ArchiveDB) DeprecatedResetAllData() error {
	log.Println("[ARCHIVE] ⚠️  DEPRECATED wrapper dipanggil — using 'default' tenant")
	return r.ResetAllData(context.Background(), "default")
}
