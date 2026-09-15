// internal/proctoring/repository/redis.go
package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type ProctoringRedis struct {
	Client *redis.Client
	Ctx    context.Context
}

func NewProctoringRedis(client *redis.Client) *ProctoringRedis {
	return &ProctoringRedis{Client: client, Ctx: context.Background()}
}

// UpdateHeartbeat memperbarui TTL kunci heartbeat peserta.
// Jika peserta tidak mengirim heartbeat selama 30 detik, kunci ini akan hilang otomatis.
func (r *ProctoringRedis) UpdateHeartbeat(participantID, examID string) error {
	key := fmt.Sprintf("heartbeat:%s:%s", examID, participantID)
	return r.Client.Set(r.Ctx, key, time.Now().Unix(), 30*time.Second).Err()
}

// IsAlive mengecek apakah peserta masih terkoneksi (kunci heartbeat masih ada)
func (r *ProctoringRedis) IsAlive(participantID, examID string) (bool, error) {
	key := fmt.Sprintf("heartbeat:%s:%s", examID, participantID)
	val, err := r.Client.Exists(r.Ctx, key).Result()
	return val > 0, err
}

// IncrementWarning menambah counter pelanggaran (tab switch, dll)
func (r *ProctoringRedis) IncrementWarning(participantID, examID string) (int64, error) {
	key := fmt.Sprintf("warnings:%s:%s", examID, participantID)
	val, err := r.Client.Incr(r.Ctx, key).Result()
	if err != nil {
		return 0, err
	}
	// Set TTL 12 jam agar otomatis hilang setelah ujian selesai
	r.Client.Expire(r.Ctx, key, 12*time.Hour)
	return val, nil
}

// GetWarnings mengambil jumlah pelanggaran saat ini
func (r *ProctoringRedis) GetWarnings(participantID, examID string) (int64, error) {
	key := fmt.Sprintf("warnings:%s:%s", examID, participantID)
	val, err := r.Client.Get(r.Ctx, key).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return val, err
}
