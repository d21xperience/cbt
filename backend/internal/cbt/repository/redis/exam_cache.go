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

// SaveAnswersBatch — pipe multi-HSet dalam 1 round-trip Redis.
// Format WAJIB sama dengan SaveAnswer (JSON ParticipantAnswer) agar GetAnswers bisa unmarshal.
func (r *ExamCache) SaveAnswersBatch(participantID, examID string, answers []domain.ParticipantAnswer) error {
	if len(answers) == 0 {
		return nil
	}

	// ✅ Key format SAMA dengan SaveAnswer
	key := fmt.Sprintf("exam:answers:%s:%s", examID, participantID)

	ctx, cancel := context.WithTimeout(r.Ctx, 3*time.Second)
	defer cancel()

	pipe := r.Client.Pipeline()
	for _, a := range answers {
		// ✅ Marshal JSON — WAJIB agar GetAnswers bisa unmarshal
		answerJSON, err := json.Marshal(a)
		if err != nil {
			continue // skip baris rusak, jangan gagalkan batch
		}
		pipe.HSet(ctx, key, a.QuestionID, answerJSON)
	}
	pipe.Expire(ctx, key, 12*time.Hour)

	_, err := pipe.Exec(ctx)
	return err
}
