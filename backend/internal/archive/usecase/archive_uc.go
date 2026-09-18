package usecase

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"cbt-engine-service/internal/archive/domain"
	archiveRepository "cbt-engine-service/internal/archive/repository"
	schedulingRepository "cbt-engine-service/internal/scheduling/repository"

	"github.com/redis/go-redis/v9"
)

type ArchiveUseCase struct {
	archiveDB    *archiveRepository.ArchiveDB
	siakadClient *schedulingRepository.SiakadSyncClient
	rdb          *redis.Client // ← Ganti redisFlush callback dengan rdb client
}

// NewArchiveUseCase — PHASE 2A: menerima rdb untuk tenant-scoped Redis delete
func NewArchiveUseCase(
	db *archiveRepository.ArchiveDB,
	client *schedulingRepository.SiakadSyncClient,
	rdb *redis.Client,
) *ArchiveUseCase {
	return &ArchiveUseCase{
		archiveDB:    db,
		siakadClient: client,
		rdb:          rdb,
	}
}

// ArchiveAndReset — full archive flow (TENANT-SCOPED)
// PHASE 2A fixes:
//   - Terima tenantID dari caller (JWT context)
//   - Redis delete SCOPED (bukan FlushAll)
//   - Pass tenantID ke archive_db methods
func (uc *ArchiveUseCase) ArchiveAndReset(
	ctx context.Context,
	tenantID string,
	schoolID string,
	semesterID string,
	isEndOfAcademicYear bool,
) error {
	if tenantID == "" {
		return errors.New("tenant_id wajib")
	}

	log.Printf("[ARCHIVE] Mulai archiving tenant=%s school=%s semester=%s endYear=%v",
		tenantID, schoolID, semesterID, isEndOfAcademicYear)

	// 1. Ambil data hasil ujian (tenant-scoped)
	results, err := uc.archiveDB.GetAllSemesterResults(ctx, tenantID, semesterID)
	if err != nil {
		return fmt.Errorf("gagal ambil data hasil ujian: %w", err)
	}
	log.Printf("[ARCHIVE] Ditemukan %d result untuk export", len(results))

	// 2. Push ke SIAKAD
	if len(results) > 0 {
		payload := domain.SemesterArchive{
			SchoolID:   schoolID,
			SemesterID: semesterID,
			ArchivedAt: time.Now(),
			Results:    results,
		}

		if err := uc.siakadClient.PushSemesterArchive(payload); err != nil {
			return fmt.Errorf("gagal kirim ke SIAKAD, archive dibatalkan: %w", err)
		}
		log.Printf("[ARCHIVE] Berhasil kirim %d data ke SIAKAD", len(results))
	}

	// 3. Delete Redis keys — SCOPED per tenant (BUKAN FlushAll)
	if err := uc.clearTenantCache(ctx, tenantID); err != nil {
		log.Printf("[ARCHIVE] Warning: Redis cleanup partial: %v", err)
		// Lanjut — jangan block archive karena Redis issue
	}

	// 4. Reset SQLite (tenant-scoped)
	if isEndOfAcademicYear {
		if err := uc.archiveDB.ResetAllData(ctx, tenantID); err != nil {
			return fmt.Errorf("reset total tenant: %w", err)
		}
	} else {
		if err := uc.archiveDB.ResetExamData(ctx, tenantID, semesterID); err != nil {
			return fmt.Errorf("reset semester tenant: %w", err)
		}
	}

	log.Printf("[ARCHIVE] SELESAI untuk tenant=%s", tenantID)
	return nil
}

// clearTenantCache — hapus Redis keys yang dimiliki tenant ini
// PHASE 2A: JANGAN pakai FlushAll — bisa hapus tenant lain
//
// Key patterns yang dikenal (Phase 1):
//   - exam:answers:{examID}:{participantID}
//   - exam:status:{examID}:{participantID}
//   - queue:essay_grading
//
// PHASE 3 akan refactor Redis key format untuk include tenant prefix.
// Untuk sekarang, kita delete pattern yang AMAN (per exam/session).
func (uc *ArchiveUseCase) clearTenantCache(ctx context.Context, tenantID string) error {
	if uc.rdb == nil {
		return nil
	}

	// Query exam IDs tenant ini
	examIDs, err := uc.listTenantExamIDs(ctx, tenantID)
	if err != nil {
		return err
	}

	if len(examIDs) == 0 {
		log.Printf("[ARCHIVE] Tidak ada exam untuk tenant %s — skip Redis cleanup", tenantID)
		return nil
	}

	log.Printf("[ARCHIVE] Membersihkan Redis untuk %d exam tenant=%s", len(examIDs), tenantID)

	totalDeleted := 0
	for _, examID := range examIDs {
		// Pattern: exam:answers:{examID}:*
		// Pattern: exam:status:{examID}:*
		patterns := []string{
			fmt.Sprintf("exam:answers:%s:*", examID),
			fmt.Sprintf("exam:status:%s:*", examID),
		}

		for _, pattern := range patterns {
			iter := uc.rdb.Scan(ctx, 0, pattern, 100).Iterator()
			for iter.Next(ctx) {
				if err := uc.rdb.Del(ctx, iter.Val()).Err(); err != nil {
					log.Printf("[ARCHIVE] Delete key %s failed: %v", iter.Val(), err)
				} else {
					totalDeleted++
				}
			}
			if err := iter.Err(); err != nil {
				return fmt.Errorf("scan %s: %w", pattern, err)
			}
		}
	}

	log.Printf("[ARCHIVE] Redis cleanup selesai: %d key dihapus", totalDeleted)
	return nil
}

// listTenantExamIDs — helper untuk ambil exam IDs tenant
func (uc *ArchiveUseCase) listTenantExamIDs(ctx context.Context, tenantID string) ([]string, error) {
	// Ambil dari exam_sessions
	const q = `SELECT DISTINCT exam_id FROM exam_sessions WHERE tenant_id = ?`
	rows, err := uc.archiveDB.DB.QueryContext(ctx, q, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err == nil {
			ids = append(ids, id)
		}
	}
	return ids, rows.Err()
}
