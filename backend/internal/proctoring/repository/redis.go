// internal/proctoring/repository/redis.go
package repository

import (
	"context"
	"errors"
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

// ============================================
// D2.6: Warning counter + lock/unlock
// ============================================

func warningsKey(examID, participantID string) string {
	return fmt.Sprintf("cbt:proctoring:%s:%s:warnings", examID, participantID)
}
func lockLevelKey(examID, participantID string) string {
	return fmt.Sprintf("cbt:proctoring:%s:%s:lock_level", examID, participantID)
}

// IncrWarning — increment counter, return new count
func (r *ProctoringRedis) IncrWarning(ctx context.Context, examID, participantID string) (int, error) {
	key := warningsKey(examID, participantID)
	n, err := r.Client.Incr(ctx, key).Result()
	if err != nil {
		return 0, err
	}
	// TTL 24 jam
	r.Client.Expire(ctx, key, 24*time.Hour)
	return int(n), nil
}

// GetWarningCount — baca counter
func (r *ProctoringRedis) GetWarningCount(ctx context.Context, examID, participantID string) (int, error) {
	v, err := r.Client.Get(ctx, warningsKey(examID, participantID)).Int()
	if err == redis.Nil {
		return 0, nil
	}
	return v, err
}

// SetLock — tandai terkunci. level = "PROCTOR" atau "ADMIN"
func (r *ProctoringRedis) SetLock(ctx context.Context, examID, participantID, level string) error {
	return r.Client.Set(ctx, lockLevelKey(examID, participantID), level, 24*time.Hour).Err()
}

// GetLockLevel — "" kalau tidak terkunci
func (r *ProctoringRedis) GetLockLevel(ctx context.Context, examID, participantID string) (string, error) {
	v, err := r.Client.Get(ctx, lockLevelKey(examID, participantID)).Result()
	if err == redis.Nil {
		return "", nil
	}
	return v, err
}

// Unlock — reset counter + hapus lock. Kalau byRole=PROCTOR dan lock=ADMIN → tolak.
func (r *ProctoringRedis) Unlock(ctx context.Context, examID, participantID, byRole string) error {
	level, _ := r.GetLockLevel(ctx, examID, participantID)
	if level == "ADMIN" && byRole != "ADMIN" && byRole != "SUPER_ADMIN" {
		return errors.New("lock_requires_admin")
	}
	// Reset counter + hapus lock
	r.Client.Del(ctx, warningsKey(examID, participantID))
	r.Client.Del(ctx, lockLevelKey(examID, participantID))
	return nil
}
