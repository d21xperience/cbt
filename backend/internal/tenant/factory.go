package tenant

import (
	"context"
	"errors"

	// Archive
	archiveRepo "cbt-engine-service/internal/archive/repository"
	archiveUC "cbt-engine-service/internal/archive/usecase"

	// CBT
	cbtRedisRepo "cbt-engine-service/internal/cbt/repository/redis"
	cbtSqliteRepo "cbt-engine-service/internal/cbt/repository/sqlite"
	cbtUc "cbt-engine-service/internal/cbt/usecase"

	// Crypto
	"cbt-engine-service/internal/crypto"

	// Proctoring
	proctoringRepo "cbt-engine-service/internal/proctoring/repository"
	proctoringUC "cbt-engine-service/internal/proctoring/usecase"

	// Scheduling
	schedulingRepo "cbt-engine-service/internal/scheduling/repository"
	schedulingUC "cbt-engine-service/internal/scheduling/usecase"

	"github.com/redis/go-redis/v9"
)

var (
	ErrNoTenantInContext = errors.New("no tenant in context")
)

// Factory — membangun usecase per-tenant.
//
// Pattern:
//   - DB handle: cached via Manager (lazy open, LRU)
//   - Usecase instance: dibuat fresh per request (cheap)
//   - Redis client: shared (tenant-prefix Phase 4)
//   - Credential cipher: shared
//   - SIAKAD client: shared
type Factory struct {
	manager      *Manager
	redisClient  *redis.Client
	credCipher   *crypto.Cipher
	siakadClient *schedulingRepo.SiakadSyncClient
}

// NewFactory — buat factory
func NewFactory(
	manager *Manager,
	rdb *redis.Client,
	cipher *crypto.Cipher,
	siakad *schedulingRepo.SiakadSyncClient,
) *Factory {
	return &Factory{
		manager:      manager,
		redisClient:  rdb,
		credCipher:   cipher,
		siakadClient: siakad,
	}
}

// Usecases — bundle semua usecase untuk tenant dari context.
// Dijalankan fresh tiap request; hanya DB handle yang di-cache.
type Usecases struct {
	// Core usecases
	SchedulingUC      *schedulingUC.SchedulingUseCase
	AdminLoginUC      *schedulingUC.AdminLoginUseCase
	ParticipantAuthUC *schedulingUC.ParticipantAuthUseCase
	CredentialsUC     *schedulingUC.CredentialsUseCase
	ProctorUC         *schedulingUC.ProctorUseCase

	// Exam usecases
	ExamUC    *cbtUc.ExamUseCase
	TokenUC   *cbtUc.TokenUseCase
	PaymentUC *cbtUc.PaymentUseCase

	// Repos yang dipakai langsung oleh handler (tanpa usecase wrapper)
	SessionRepo interface{} // *cbtSqliteRepo.SessionDB
	// ... lainnya di Phase 3B

	// Archive
	ArchiveUC *archiveUC.ArchiveUseCase

	// Proctoring
	ProctoringUC *proctoringUC.ProctoringUseCase
}

// BuildUsecases — bangun bundle usecase untuk tenant dari context.
// Return error kalau tenant info tidak ada di context.
func (f *Factory) Usecases(ctx context.Context) (*Usecases, error) {
	info := FromContext(ctx)
	if info == nil {
		return nil, ErrNoTenantInContext
	}

	// Get tenant DB handle (cached)
	db, err := f.manager.Get(ctx, info.TenantID, info.DBPath)
	if err != nil {
		return nil, err
	}

	// === Build repos (fresh, cheap) ===
	// Scheduling repos
	localAuthDB := schedulingRepo.NewLocalAuthDB(db)
	adminDB := schedulingRepo.NewAdminDB(db)
	credRepo := schedulingRepo.NewCredentialsDB(db)
	proctorDB := schedulingRepo.NewProctorDB(db)

	// CBT repos
	examDB := cbtSqliteRepo.NewExamDB(db)
	sessionDB := cbtSqliteRepo.NewSessionDB(db)
	tokenDB := cbtSqliteRepo.NewTokenDB(db)
	paymentDB := cbtSqliteRepo.NewPaymentDB(db)

	// Archive
	archiveDB := archiveRepo.NewArchiveDB(db)

	// Redis-based (shared client — tenant prefix Phase 4)
	examCache := cbtRedisRepo.NewExamCache(f.redisClient)
	proctoringRedis := proctoringRepo.NewProctoringRedis(f.redisClient)

	// === Build usecases ===
	uc := &Usecases{
		SchedulingUC:      schedulingUC.NewSchedulingUseCase(localAuthDB, f.siakadClient),
		AdminLoginUC:      schedulingUC.NewAdminLoginUseCase(adminDB),
		ParticipantAuthUC: schedulingUC.NewParticipantAuthUseCase(credRepo, f.credCipher),
		CredentialsUC:     schedulingUC.NewCredentialsUseCase(credRepo, f.credCipher),
		ProctorUC:         schedulingUC.NewProctorUseCase(proctorDB),

		ExamUC:    cbtUc.NewExamUseCase(examDB, examCache, examDB, examCache),
		TokenUC:   cbtUc.NewTokenUseCase(tokenDB, sessionDB),
		PaymentUC: cbtUc.NewPaymentUseCase(paymentDB),

		SessionRepo: sessionDB,

		ArchiveUC:    archiveUC.NewArchiveUseCase(archiveDB, f.siakadClient, f.redisClient),
		ProctoringUC: proctoringUC.NewProctoringUseCase(proctoringRedis),
	}

	return uc, nil
}

// ManagerStats — expose stats untuk health endpoint
func (f *Factory) ManagerStats() map[string]any {
	return f.manager.Stats()
}
