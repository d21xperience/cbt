// internal/proctoring/usecase/proctoring_uc.go
package usecase

import (
	"cbt-engine-service/internal/proctoring/domain"
	"cbt-engine-service/internal/proctoring/repository"
	"context"
	"errors"
	"fmt"
	"time"
)

type ProctoringUseCase struct {
	redisRepo   *repository.ProctoringRedis
	maxWarnings int64 // Batas maksimal peringatan sebelum diskualifikasi
}

func NewProctoringUseCase(repo *repository.ProctoringRedis) *ProctoringUseCase {
	return &ProctoringUseCase{
		redisRepo:   repo,
		maxWarnings: 3, // Maksimal 3 kali peringatan
	}
}

// ProcessHeartbeat dipanggil setiap 10-15 detik dari Frontend
func (uc *ProctoringUseCase) ProcessHeartbeat(ctx context.Context, participantID, examID string) error {
	return uc.redisRepo.UpdateHeartbeat(participantID, examID)
}

// ProcessTelemetry menangani event kecurangan (Tab switch, blur, dll)
func (uc *ProctoringUseCase) ProcessTelemetry(ctx context.Context, event domain.TelemetryEvent) (*domain.ProctoringAction, error) {
	// 1. Cek apakah peserta benar-benar hidup (mencegah spoofing event dari klien yang sudah disconnect)
	isAlive, _ := uc.redisRepo.IsAlive(event.ParticipantID, event.ExamID)
	if !isAlive {
		return nil, errors.New("sesi ujian telah berakhir atau terputus")
	}

	// 2. Jika event adalah pelanggaran, increment warning
	if event.EventType == "TAB_SWITCH" || event.EventType == "WINDOW_BLUR" || event.EventType == "FULLSCREEN_EXIT" {
		warningCount, err := uc.redisRepo.IncrementWarning(event.ParticipantID, event.ExamID)
		if err != nil {
			return nil, err
		}

		// 3. Evaluasi batas peringatan
		if warningCount >= uc.maxWarnings {
			return &domain.ProctoringAction{
				Action: "FORCE_SUBMIT",
				Reason: "Anda telah melanggar aturan ujian lebih dari 3 kali. Ujian akan dikumpulkan paksa.",
			}, nil
		}

		// Di dalam func ProcessTelemetry, saat warningCount >= uc.maxWarnings:
		if warningCount >= uc.maxWarnings {
			// 🔥 TAMBAHKAN INI: Set status banned di Redis agar middleware memblokir request selanjutnya
			banKey := fmt.Sprintf("banned:%s:%s", event.ExamID, event.ParticipantID)
			uc.redisRepo.Client.Set(uc.redisRepo.Ctx, banKey, "true", 12*time.Hour)

			return &domain.ProctoringAction{
				Action: "FORCE_SUBMIT",
				Reason: "Anda telah melanggar aturan >3 kali. Akses ke server ujian telah diblokir.",
			}, nil
		}

		return &domain.ProctoringAction{
			Action: "WARN",
			Reason: "Peringatan ke-" + string(rune(warningCount+'0')) + ": Dilarang berpindah tab/jendela!",
		}, nil
	}

	// Event lain (misal: FOCUS, HEARTBEAT) tidak perlu tindakan khusus
	return &domain.ProctoringAction{Action: "OK", Reason: ""}, nil
}

// UnlockParticipant — proctor/admin unlock siswa
func (uc *ProctoringUseCase) UnlockParticipant(ctx context.Context, examID, participantID, byRole string) error {
	return uc.redisRepo.Unlock(ctx, examID, participantID, byRole)
}

// RecordWarningAndLock — dipanggil saat warning bertambah
// Kalau counter >= 3, set lock level PROCTOR (bisa di-unlock proctor)
func (uc *ProctoringUseCase) RecordWarningAndLock(ctx context.Context, examID, participantID string) (int, error) {
	n, err := uc.redisRepo.IncrWarning(ctx, examID, participantID)
	if err != nil {
		return 0, err
	}
	if n >= 3 {
		_ = uc.redisRepo.SetLock(ctx, examID, participantID, "PROCTOR")
	}
	return n, nil
}
