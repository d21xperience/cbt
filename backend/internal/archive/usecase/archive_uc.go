package usecase

import (
	"cbt-engine-service/internal/archive/domain"
	"cbt-engine-service/internal/archive/repository"
	archiveRepository "cbt-engine-service/internal/archive/repository"       // SiakadSyncClient
	schedulingRepository "cbt-engine-service/internal/scheduling/repository" // SiakadSyncClient
	"context"
	"errors"
	"log"
	"time"
)

type ArchiveUseCase struct {
	archiveDB    *archiveRepository.ArchiveDB
	siakadClient *schedulingRepository.SiakadSyncClient // Menggunakan client yang sudah ada
	redisFlusher func() error                           // Callback untuk flush Redis
}

func NewArchiveUseCase(db *repository.ArchiveDB, client *schedulingRepository.SiakadSyncClient, redisFlush func() error) *ArchiveUseCase {
	return &ArchiveUseCase{
		archiveDB:    db,
		siakadClient: client,
		redisFlusher: redisFlush,
	}
}

// ArchiveAndReset adalah fungsi "Nuklir" akhir semester
func (uc *ArchiveUseCase) ArchiveAndReset(ctx context.Context, schoolID, semesterID string, isEndOfAcademicYear bool) error {
	log.Println("[ARCHIVE] Memulai proses Archiving...")

	// 1. Ambil semua data dari SQLite untuk di-export
	results, err := uc.archiveDB.GetAllSemesterResults()
	if err != nil {
		return errors.New("gagal mengambil data hasil ujian")
	}

	if len(results) > 0 {
		// 2. Kirim ke SIAKAD via Cloudflare Tunnel
		payload := domain.SemesterArchive{
			SchoolID:   schoolID,
			SemesterID: semesterID,
			ArchivedAt: time.Now(),
			Results:    results,
		}

		err = uc.siakadClient.PushSemesterArchive(payload)
		if err != nil {
			return errors.New("gagal mengirim data ke server SIAKAD. Proses reset dibatalkan.")
		}
		log.Printf("[ARCHIVE] Berhasil mengirim %d data hasil ujian ke SIAKAD.", len(results))
	}

	// 3. Flush Redis (Hapus cache jawaban real-time)
	if uc.redisFlusher != nil {
		uc.redisFlusher()
	}

	// 4. Eksekusi Reset SQLite berdasarkan level
	if isEndOfAcademicYear {
		// LEVEL 2: Hapus semua & VACUUM
		if err := uc.archiveDB.ResetAllData(); err != nil {
			return errors.New("gagal melakukan reset total database lokal")
		}
	} else {
		// LEVEL 1: Hanya hapus transaksional semester ini
		if err := uc.archiveDB.ResetExamData(semesterID); err != nil {
			return errors.New("gagal melakukan reset data transaksional")
		}
	}

	log.Println("[ARCHIVE] Proses Archiving SELESAI.")
	return nil
}
