package usecase

import (
	"cbt-engine-service/internal/grading/repository"
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

type EssayPayload struct {
	ParticipantID string `json:"participant_id"`
	ExamID        string `json:"exam_id"`
	QuestionID    string `json:"question_id"`
	AnswerText    string `json:"answer_text"`
}

// StartGradingWorker mendengarkan antrian Redis dan memproses jawaban esai
// Kita gunakan timeout 5 detik pada BRPOP agar bisa mengecek context cancellation (Graceful Shutdown)
func StartGradingWorker(ctx context.Context, redisClient *redis.Client, gradingDB *repository.GradingDB) {
	log.Println("🤖 Auto-Grading Worker started, listening to queue:essay_grading...")

	for {
		// Cek apakah aplikasi sedang di-shutdown
		select {
		case <-ctx.Done():
			log.Println("🛑 Grading worker shutting down gracefully...")
			return
		default:
		}

		// BRPOP dengan timeout 5 detik.
		// Jika tidak ada data selama 5 detik, akan return error redis.Nil, lalu loop ulang dan cek ctx lagi.
		result, err := redisClient.BRPop(ctx, 5*time.Second, "queue:essay_grading").Result()
		if err != nil {
			if err == redis.Nil || err == context.DeadlineExceeded {
				continue // Timeout habis, tidak ada data, lanjutkan loop
			}
			if err == context.Canceled {
				return // Context dibatalkan (shutdown), keluar dari loop
			}
			log.Printf("[GRADING] Error popping from Redis: %v", err)
			time.Sleep(2 * time.Second) // Jeda sebentar jika Redis error
			continue
		}

		// Parse JSON payload
		var payload EssayPayload
		if err := json.Unmarshal([]byte(result[1]), &payload); err != nil {
			log.Printf("[GRADING] Error unmarshaling payload: %v", err)
			continue
		}

		// 1. Logika grading esai (Bisa diganti dengan panggilan ke AI API / LLM)
		score := gradeEssay(payload.AnswerText)

		// 2. Simpan nilai esai ke SQLite via Repository
		if err := gradingDB.SaveEssayScore(payload.ParticipantID, payload.ExamID, payload.QuestionID, score); err != nil {
			log.Printf("[GRADING] Gagal menyimpan nilai esai untuk peserta %s: %v", payload.ParticipantID, err)
		} else {
			log.Printf("✅ Essay graded for participant %s, question %s. Score: %.2f", payload.ParticipantID, payload.QuestionID, score)
		}
	}
}

// gradeEssay adalah fungsi dummy untuk mensimulasikan koreksi esai.
// Di produksi, fungsi ini bisa memanggil API OpenAI/Gemini atau mencocokkan keyword (rubrik).
func gradeEssay(answer string) float64 {
	// Simulasi: Semakin panjang jawaban, semakin tinggi nilainya (Mock)
	if len(answer) > 100 {
		return 90.0
	} else if len(answer) > 50 {
		return 75.0
	}
	return 50.0
}
