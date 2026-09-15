package usecase

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"cbt-engine-service/internal/grading/repository"

	"github.com/redis/go-redis/v9"
)

type EssayPayload struct {
	ParticipantID string `json:"participant_id"`
	ExamID        string `json:"exam_id"`
	QuestionID    string `json:"question_id"`
	AnswerText    string `json:"answer_text"`
}

// StartGradingWorker — Business decision: esai dinilai MANUAL oleh guru.
// Worker TIDAK auto-grade. Hanya menandai essay sebagai PENDING (score = -1).
// Guru mengisi nilai via endpoint /admin/grading/essay nanti (PHASE 8).
func StartGradingWorker(ctx context.Context, redisClient *redis.Client, gradingDB *repository.GradingDB) {
	log.Println("📝 Essay Review Worker started, listening to queue:essay_grading...")

	for {
		select {
		case <-ctx.Done():
			log.Println("🛑 Grading worker shutting down gracefully...")
			return
		default:
		}

		result, err := redisClient.BRPop(ctx, 5*time.Second, "queue:essay_grading").Result()
		if err != nil {
			if err == redis.Nil || err == context.DeadlineExceeded {
				continue
			}
			if err == context.Canceled {
				return
			}
			log.Printf("[REVIEW] Redis error: %v", err)
			time.Sleep(2 * time.Second)
			continue
		}

		var payload EssayPayload
		if err := json.Unmarshal([]byte(result[1]), &payload); err != nil {
			log.Printf("[REVIEW] Unmarshal error: %v", err)
			continue
		}

		// Simpan marker PENDING (score = -1). Nilai akan diisi guru via UI.
		if err := gradingDB.SaveEssayScore(
			payload.ParticipantID,
			payload.ExamID,
			payload.QuestionID,
			-1, // sentinel: PENDING REVIEW
		); err != nil {
			log.Printf("[REVIEW] Gagal mark pending: participant=%s q=%s err=%v",
				payload.ParticipantID, payload.QuestionID, err)
			continue
		}
		log.Printf("📌 Essay marked PENDING for manual review: participant=%s question=%s",
			payload.ParticipantID, payload.QuestionID)
	}
}
