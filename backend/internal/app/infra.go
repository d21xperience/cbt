// internal/app/infra.go
package app

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	archiveRepo "cbt-engine-service/internal/archive/repository"
	archiveUC "cbt-engine-service/internal/archive/usecase"
	cbtRedisRepo "cbt-engine-service/internal/cbt/repository/redis"
	cbtSqliteRepo "cbt-engine-service/internal/cbt/repository/sqlite"
	cbtUC "cbt-engine-service/internal/cbt/usecase"
	"cbt-engine-service/internal/config"
	"cbt-engine-service/internal/crypto"
	platformRepo "cbt-engine-service/internal/platform/repository"
	platformUC "cbt-engine-service/internal/platform/usecase"
	proctoringRepo "cbt-engine-service/internal/proctoring/repository"
	proctoringUC "cbt-engine-service/internal/proctoring/usecase"
	schedulingRepo "cbt-engine-service/internal/scheduling/repository"
	schedulingUC "cbt-engine-service/internal/scheduling/usecase"
	"cbt-engine-service/internal/tenant"
	"cbt-engine-service/pkg/auth"

	_ "github.com/mattn/go-sqlite3"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
)

// Infrastructure — semua dependency runtime aplikasi.
type Infrastructure struct {
	Cfg config.Config

	// === Platform (cross-tenant) ===
	PlatformDB   *sql.DB
	PlatformUser *platformRepo.PlatformUserDB
	TenantMgr    *tenant.Manager
	TenantUC     *platformUC.TenantUseCase
	Factory      *tenant.Factory

	// === Shared services ===
	Redis      *redis.Client
	CredCipher *crypto.Cipher
	Siakad     *schedulingRepo.SiakadSyncClient

	// === Default tenant (legacy compat untuk handler belum migrated) ===
	DefaultTenantID string
	DefaultDB       *sql.DB

	// === Handler dependencies ===
	HandlerDeps HandlerDeps
}

// HandlerDeps — dependencies untuk CBTHandler constructor.
// Field ini akan dihapus di Phase 3B setelah semua handler migrated.
type HandlerDeps struct {
	SchedulingUC      *schedulingUC.SchedulingUseCase
	AdminLoginUC      *schedulingUC.AdminLoginUseCase
	ParticipantAuthUC *schedulingUC.ParticipantAuthUseCase
	CredentialsUC     *schedulingUC.CredentialsUseCase
	ExamUC            *cbtUC.ExamUseCase
	ArchiveUC         *archiveUC.ArchiveUseCase
	ProctoringUC      *proctoringUC.ProctoringUseCase
	SessionDB         *cbtSqliteRepo.SessionDB
	TokenUC           *cbtUC.TokenUseCase
	ProctorUC         *schedulingUC.ProctorUseCase
	PaymentUC         *cbtUC.PaymentUseCase
}

// InitInfra — build Infrastructure from config.
// Order matters: platform DB → tenant manager → crypto → Redis → JWT → factory → legacy deps.
func InitInfra(cfg config.Config) (*Infrastructure, error) {
	infra := &Infrastructure{Cfg: cfg}

	// 1. Platform DB
	if err := infra.initPlatformDB(); err != nil {
		return nil, err
	}

	// 2. Crypto (no dependency)
	if err := infra.initCrypto(); err != nil {
		return nil, err
	}

	// 3. Redis (before tenant manager)
	if err := infra.initRedis(); err != nil {
		return nil, err
	}

	// 4. Tenant Manager + Usecase (needs Redis)
	if err := infra.initTenantManager(); err != nil {
		return nil, err
	}

	// 5. JWT
	if err := infra.initJWT(); err != nil {
		return nil, err
	}

	// 6. Default tenant
	if err := infra.initDefaultTenant(); err != nil {
		return nil, err
	}

	// 7. Siakad + Factory + Legacy deps
	infra.Siakad = schedulingRepo.NewSiakadSyncClient(cfg.SiakadBaseURL)
	infra.Factory = tenant.NewFactory(infra.TenantMgr, infra.Redis, infra.CredCipher, infra.Siakad)

	if err := infra.initLegacyDeps(); err != nil {
		return nil, err
	}

	return infra, nil
}

func (i *Infrastructure) initPlatformDB() error {
	platformDB, err := sql.Open("sqlite3",
		i.Cfg.PlatformDBPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		return err
	}
	platformDB.SetMaxOpenConns(1)
	if err := platformDB.Ping(); err != nil {
		platformDB.Close()
		return err
	}
	i.PlatformDB = platformDB
	log.Info().Str("path", i.Cfg.PlatformDBPath).Msg("✅ Platform DB siap")
	return nil
}

func (i *Infrastructure) initTenantManager() error {
	i.TenantMgr = tenant.NewManager(
		i.Cfg.TenantMaxOpen,
		time.Duration(i.Cfg.TenantIdleTTLMinutes)*time.Minute,
	)
	tenantRepo := platformRepo.NewTenantDB(i.PlatformDB)
	subRepo := platformRepo.NewSubscriptionDB(i.PlatformDB)
	provisioner := tenant.NewProvisioner(i.Cfg.TenantBasePath)

	i.TenantUC = platformUC.NewTenantUseCaseFull(
		tenantRepo,
		subRepo,
		provisioner,
		i.Redis,
		i.Cfg.TenantBasePath,
	)
	i.PlatformUser = platformRepo.NewPlatformUserDB(i.PlatformDB)

	log.Info().
		Int("max_open", i.Cfg.TenantMaxOpen).
		Msg("✅ Tenant DB Manager + Provisioner + SubRepo siap")
	return nil
}

func (i *Infrastructure) initCrypto() error {
	if i.Cfg.CredentialsEncryptionKey == "" {
		return errors.New("CREDENTIALS_ENCRYPTION_KEY wajib diisi")
	}
	cipher, err := crypto.NewCipherFromHex(i.Cfg.CredentialsEncryptionKey)
	if err != nil {
		return err
	}
	i.CredCipher = cipher
	log.Info().Msg("✅ Encryption cipher siap")
	return nil
}

func (i *Infrastructure) initRedis() error {
	rdb := redis.NewClient(&redis.Options{
		Addr:     i.Cfg.RedisAddr,
		Password: i.Cfg.RedisPassword,
		DB:       0,
		PoolSize: 50,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		rdb.Close()
		return err
	}
	i.Redis = rdb
	log.Info().Msg("✅ Redis siap")
	return nil
}

func (i *Infrastructure) initJWT() error {
	if i.Cfg.JWTSecret == "" || len(i.Cfg.JWTSecret) < 32 {
		return errors.New("JWT_SECRET wajib di-set, minimal 32 karakter")
	}
	auth.Init(i.Cfg.JWTSecret)
	log.Info().Msg("✅ JWT Secret berhasil dimuat")
	return nil
}

func (i *Infrastructure) initDefaultTenant() error {
	ctx := context.Background()

	// Subdomain dari config (default: "default", dev: "dev")
	subdomain := i.Cfg.DefaultTenantSubdomain
	if subdomain == "" {
		subdomain = "default"
	}

	res, err := i.TenantUC.ResolveBySubdomain(ctx, subdomain)
	if err != nil {
		return fmt.Errorf("default tenant '%s' tidak ditemukan di platform DB: %w", subdomain, err)
	}
	db, err := i.TenantMgr.Get(ctx, res.TenantID, res.DBPath)
	if err != nil {
		return err
	}
	i.DefaultTenantID = res.TenantID
	i.DefaultDB = db
	log.Info().
		Str("tenant_id", res.TenantID).
		Str("subdomain", subdomain).
		Msg("✅ Default tenant resolved")
	return nil
}

func (i *Infrastructure) initLegacyDeps() error {
	db := i.DefaultDB
	// tenantID := i.DefaultTenantID

	localAuthDB := schedulingRepo.NewLocalAuthDB(db)
	adminDB := schedulingRepo.NewAdminDB(db)
	credRepo := schedulingRepo.NewCredentialsDB(db)
	proctorDB := schedulingRepo.NewProctorDB(db)
	examDB := cbtSqliteRepo.NewExamDB(db)
	sessionDB := cbtSqliteRepo.NewSessionDB(db)
	tokenDB := cbtSqliteRepo.NewTokenDB(db)
	paymentDB := cbtSqliteRepo.NewPaymentDB(db)
	archiveDB := archiveRepo.NewArchiveDB(db)
	examCache := cbtRedisRepo.NewExamCache(i.Redis)
	proctoringRedis := proctoringRepo.NewProctoringRedis(i.Redis)

	i.HandlerDeps = HandlerDeps{
		SchedulingUC:      schedulingUC.NewSchedulingUseCase(localAuthDB, i.Siakad),
		AdminLoginUC:      schedulingUC.NewAdminLoginUseCase(adminDB),
		ParticipantAuthUC: schedulingUC.NewParticipantAuthUseCase(credRepo, i.CredCipher),
		CredentialsUC:     schedulingUC.NewCredentialsUseCase(credRepo, i.CredCipher),
		ProctorUC:         schedulingUC.NewProctorUseCase(proctorDB),
		ExamUC:            cbtUC.NewExamUseCase(examDB, examCache, examDB, examCache),
		TokenUC:           cbtUC.NewTokenUseCase(tokenDB, sessionDB),
		PaymentUC:         cbtUC.NewPaymentUseCase(paymentDB),
		ArchiveUC:         archiveUC.NewArchiveUseCase(archiveDB, i.Siakad, i.Redis),
		ProctoringUC:      proctoringUC.NewProctoringUseCase(proctoringRedis),
		SessionDB:         sessionDB,
	}
	return nil
}

// Close — cleanup semua resource. Order: tenant manager → platform → redis.
func (i *Infrastructure) Close() {
	log.Info().Msg("🛑 Menutup infrastructure...")

	if i.TenantMgr != nil {
		i.TenantMgr.CloseAll()
	}
	if i.PlatformDB != nil {
		i.PlatformDB.Close()
	}
	if i.Redis != nil {
		i.Redis.Close()
	}

	log.Info().Msg("✅ Infrastructure ditutup")
}
