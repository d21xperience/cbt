// package redis

// import (
// 	"cbt-engine-service/internal/cbt/domain"
// 	"context"
// 	"fmt"
// 	"time"

// 	"github.com/redis/go-redis/v9"
// )

// type cbtRedisRepository struct {
// 	rdb *redis.Client
// }

// // NewCbtRedisRepository membuat instance baru untuk caching jawaban di Redis
// func NewCbtRedisRepository(rdb *redis.Client) domain.CbtRedisRepository {
// 	return &cbtRedisRepository{rdb: rdb}
// }

// // Fungsi bantu untuk membuat format key Redis yang konsisten
// func makeAnswerKey(examID, studentID string) string {
// 	return fmt.Sprintf("exam:ans:%s:%s", examID, studentID)
// }

// func (r *cbtRedisRepository) SaveAnswerCache(ctx context.Context, studentID, examID, questionID, answer string) error {
// 	key := makeAnswerKey(examID, studentID)

// 	// HSet menyimpan jawaban siswa secara real-time ke dalam struktur Hash di RAM Redis
// 	err := r.rdb.HSet(ctx, key, questionID, answer).Err()
// 	return err
// }

// func (r *cbtRedisRepository) GetAnswersCache(ctx context.Context, studentID, examID string) (map[string]string, error) {
// 	key := makeAnswerKey(examID, studentID)

// 	// HGetAll mengambil seluruh daftar jawaban berbentuk field-value map
// 	answers, err := r.rdb.HGetAll(ctx, key).Result()
// 	if err != nil {
// 		return nil, err
// 	}
// 	return answers, nil
// }

// func (r *cbtRedisRepository) DeleteAnswersCache(ctx context.Context, studentID, examID string) error {
// 	key := makeAnswerKey(examID, studentID)
// 	err := r.rdb.Del(ctx, key).Err()
// 	return err
// }

// // Tambahkan di internal/repository/redis/exam_cache.go

// func (r *cbtRedisRepository) SetExamToken(ctx context.Context, examID string, token string, duration time.Duration) error {
// 	key := fmt.Sprintf("exam:token:%s", examID)
// 	// Menggunakan rdb.Set dengan parameter duration (TTL) otomatis
// 	return r.rdb.Set(ctx, key, token, duration).Err()
// }

// func (r *cbtRedisRepository) GetExamToken(ctx context.Context, examID string) (string, error) {
// 	key := fmt.Sprintf("exam:token:%s", examID)
// 	val, err := r.rdb.Get(ctx, key).Result()
// 	if err == redis.Nil {
// 		return "", nil // Token kedaluwarsa atau tidak ada
// 	}
// 	return val, err
// }

// // Tambahkan di internal/repository/redis/exam_cache.go

// func (r *cbtRedisRepository) SetStudentStatus(ctx context.Context, examID, studentID, status string) error {
// 	key := fmt.Sprintf("exam:status:%s", examID)
// 	// Menyimpan status dengan timestamp, misal: "CONNECTED|2026-06-14 01:00:00"
// 	timeStr := time.Now().Format("15:04:05")
// 	value := fmt.Sprintf("%s|%s", status, timeStr)

// 	return r.rdb.HSet(ctx, key, studentID, value).Err()
// }

// func (r *cbtRedisRepository) GetAllStudentsStatus(ctx context.Context, examID string) (map[string]string, error) {
// 	key := fmt.Sprintf("exam:status:%s", examID)
// 	return r.rdb.HGetAll(ctx, key).Result()
// }

// internal/repository/redis/exam_cache.go
package redis

import (
	"cbt-engine-service/internal/cbt/domain"
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type ExamCache struct {
	Client *redis.Client
	Ctx    context.Context
}

func NewExamCache(client *redis.Client) *ExamCache {
	return &ExamCache{
		Client: client,
		Ctx:    context.Background(),
	}
}

// SaveAnswer menyimpan jawaban sementara peserta.
// Menggunakan Redis Hash agar semua jawaban untuk 1 ujian berada di 1 key.
func (r *ExamCache) SaveAnswer(participantID, examID string, answer domain.ParticipantAnswer) error {
	key := fmt.Sprintf("exam:answers:%s:%s", examID, participantID)

	answerJSON, err := json.Marshal(answer)
	if err != nil {
		return err
	}

	// HSet menyimpan field (question_id) dan value (json answer)
	// Kita juga set TTL misal 12 jam untuk keamanan memori
	err = r.Client.HSet(r.Ctx, key, answer.QuestionID, answerJSON).Err()
	if err != nil {
		return err
	}

	return r.Client.Expire(r.Ctx, key, 12*time.Hour).Err()
}

// GetAnswers mengambil semua jawaban peserta dari Redis untuk dikoreksi
func (r *ExamCache) GetAnswers(participantID, examID string) (map[string]domain.ParticipantAnswer, error) {
	key := fmt.Sprintf("exam:answers:%s:%s", examID, participantID)

	result, err := r.Client.HGetAll(r.Ctx, key).Result()
	if err != nil {
		return nil, err
	}

	answers := make(map[string]domain.ParticipantAnswer)
	for qID, jsonStr := range result {
		var ans domain.ParticipantAnswer
		if err := json.Unmarshal([]byte(jsonStr), &ans); err == nil {
			answers[qID] = ans
		}
	}
	return answers, nil
}

// UpdateParticipantStatus melacak apakah peserta online/offline
func (r *ExamCache) UpdateParticipantStatus(status domain.ParticipantStatus) error {
	key := fmt.Sprintf("exam:status:%s:%s", status.ExamID, status.ParticipantID)

	statusJSON, err := json.Marshal(status)
	if err != nil {
		return err
	}

	// TTL 5 menit. Jika frontend tidak melakukan ping/heartbeat, status akan hilang (dianggap disconnect)
	return r.Client.Set(r.Ctx, key, statusJSON, 5*time.Minute).Err()
}

// ClearParticipantData membersihkan jawaban dari Redis setelah berhasil disimpan ke SQLite
func (r *ExamCache) ClearParticipantData(participantID, examID string) error {
	keyAnswers := fmt.Sprintf("exam:answers:%s:%s", examID, participantID)
	keyStatus := fmt.Sprintf("exam:status:%s:%s", examID, participantID)

	return r.Client.Del(r.Ctx, keyAnswers, keyStatus).Err()
}
func (r *ExamCache) ClearAnswers(participantID, examID string) error {
	key := fmt.Sprintf("exam:answers:%s:%s", examID, participantID)
	return r.Client.Del(r.Ctx, key).Err()
}

// EnqueueEssayGrading memasukkan payload ke Redis queue untuk diproses worker
func (r *ExamCache) EnqueueEssayGrading(payload domain.EssayGradingPayload) error {
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("gagal marshal payload: %w", err)
	}

	// LPUSH untuk menambahkan ke antrian (worker akan BRPOP)
	return r.Client.LPush(r.Ctx, "queue:essay_grading", payloadJSON).Err()
}
