package main

import (
	"context"
	"database/sql"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"strings"
	"syscall"
	"time"

	"cbt-engine-service/internal/archive/repository"
	archiveUc "cbt-engine-service/internal/archive/usecase"
	cbtHttp "cbt-engine-service/internal/cbt/delivery/http"
	cbtRedisRepo "cbt-engine-service/internal/cbt/repository/redis"
	cbtSqliteRepo "cbt-engine-service/internal/cbt/repository/sqlite"
	cbtUc "cbt-engine-service/internal/cbt/usecase"
	"cbt-engine-service/internal/config"
	"cbt-engine-service/internal/crypto"
	"cbt-engine-service/internal/middleware"
	proctoringRepo "cbt-engine-service/internal/proctoring/repository"
	proctoringUc "cbt-engine-service/internal/proctoring/usecase"
	schedulingRepo "cbt-engine-service/internal/scheduling/repository"
	schedulingUc "cbt-engine-service/internal/scheduling/usecase"
	"cbt-engine-service/pkg/auth"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	_ "github.com/mattn/go-sqlite3"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func main() {
	// ==========================================
	// 1. LOGGER & CONFIG
	// ==========================================
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339})
	log.Info().Msg("🚀 Memulai CBT Test Engine Service (Modular Monolith Mode)...")

	cfg, err := config.LoadConfig(".")
	if err != nil {
		log.Fatal().Err(err).Msg("Gagal memuat konfigurasi aplikasi CBT")
	}

	// ==========================================
	// 2. SQLITE INITIALIZATION + PRAGMA OPTIMIZATION
	// ==========================================
	// Sangat krusial untuk VPS 2GB RAM agar tidak terjadi "Database is Locked" dan hemat I/O
	db, err := sql.Open("sqlite3", cfg.DbSource+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		log.Fatal().Err(err).Msg("Gagal membuka file SQLite")
	}

	// Terapkan PRAGMA untuk performa maksimal di VPS hemat resource
	pragmas := []string{
		"PRAGMA journal_mode=WAL;",    // Write-Ahead Logging (Concurrent read/write)
		"PRAGMA synchronous=NORMAL;",  // Kurangi fsync, percepat write
		"PRAGMA cache_size=-64000;",   // Batasi cache SQLite di RAM (64MB)
		"PRAGMA temp_store=MEMORY;",   // Simpan temporary table di RAM
		"PRAGMA mmap_size=268435456;", // Memory mapped I/O (256MB)
	}
	for _, pragma := range pragmas {
		if _, err := db.Exec(pragma); err != nil {
			log.Warn().Err(err).Msgf("Gagal mengeksekusi %s", pragma)
		}
	}

	// Batasi koneksi SQLite (SQLite tidak bagus dengan banyak koneksi write bersamaan)
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	defer db.Close()
	log.Info().Msg("✅ Database SQLite berhasil diaktifkan dengan PRAGMA Optimized")

	// Crypto cipher untuk credential
	if cfg.CredentialsEncryptionKey == "" {
		log.Fatal().Msg("CREDENTIALS_ENCRYPTION_KEY wajib diisi di .env")
	}
	credCipher, err := crypto.NewCipherFromHex(cfg.CredentialsEncryptionKey)
	if err != nil {
		log.Fatal().Err(err).Msg("Gagal init encryption cipher")
	}
	log.Info().Msg("✅ Encryption cipher siap")
	// ==========================================
	// 3. REDIS INITIALIZATION
	// ==========================================
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       0,
		PoolSize: 50, // Batasi pool size agar hemat RAM
	})

	ctxPing, cancelPing := context.WithTimeout(context.Background(), 3*time.Second)
	if err := rdb.Ping(ctxPing).Err(); err != nil {
		cancelPing()
		log.Fatal().Err(err).Msg("Gagal terhubung ke Redis Server")
	}
	cancelPing()
	defer rdb.Close()
	log.Info().Msg("✅ Koneksi Redis Server penyangga berhasil dibangun")

	// ==========================================
	// 4. JWT AUTH INITIALIZATION
	// ==========================================
	if cfg.JWTSecret == "" || len(cfg.JWTSecret) < 32 {
		log.Fatal().Msg("JWT_SECRET wajib di-set, minimal 32 karakter")
	}
	auth.Init(cfg.JWTSecret)
	log.Info().Msg("✅ JWT Secret berhasil dimuat")

	// ==========================================
	// 5. REPOSITORY LAYER (Dependency Injection)
	// ==========================================
	// Scheduling
	siakadClient := schedulingRepo.NewSiakadSyncClient(cfg.SiakadBaseURL)
	localAuthDB := schedulingRepo.NewLocalAuthDB(db)
	adminDB := schedulingRepo.NewAdminDB(db)
	// CBT Core
	examDB := cbtSqliteRepo.NewExamDB(db)
	examCache := cbtRedisRepo.NewExamCache(rdb)

	// Proctoring
	proctoringRedis := proctoringRepo.NewProctoringRedis(rdb)

	// Archive
	archiveDB := repository.NewArchiveDB(db)

	// ==========================================
	// 6. USECASE LAYER
	// ==========================================
	schedulingUC := schedulingUc.NewSchedulingUseCase(localAuthDB, siakadClient)
	adminLoginUC := schedulingUc.NewAdminLoginUseCase(adminDB) // ← NEW
	examUC := cbtUc.NewExamUseCase(examDB, examCache, examDB, examCache)
	proctoringUC := proctoringUc.NewProctoringUseCase(proctoringRedis)
	redisFlush := func() error { return rdb.FlushAll(context.Background()).Err() }
	archiveUC := archiveUc.NewArchiveUseCase(archiveDB, siakadClient, redisFlush)

	// ==========================================
	// 7. FIBER APP SETUP (HARDENED FOR VPS)
	// ==========================================
	app := fiber.New(fiber.Config{
		BodyLimit:    5 * 1024 * 1024,
		Concurrency:  256 * runtime.NumCPU(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
		// ✅ Custom error handler — JANGAN bocorkan internal error ke client
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			reqID, _ := c.Locals("requestid").(string)
			return c.Status(code).JSON(fiber.Map{
				"error":      http.StatusText(code),
				"request_id": reqID,
			})
		},
	})

	// ✅ Middleware order KRITIS
	app.Use(middleware.RequestID())                         // 1. Set request ID first
	app.Use(middleware.Recover())                           // 2. Recover panic, ada request ID
	app.Use(middleware.SecurityHeaders(cfg.IsProduction())) // 3. Headers
	app.Use(middleware.RequestLogger())                     // 4. Log request

	// ✅ CORS diperketat
	allowedOrigins := strings.Split(cfg.AllowedOrigin, ",")
	for i := range allowedOrigins {
		allowedOrigins[i] = strings.TrimSpace(allowedOrigins[i])
	}

	app.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Join(allowedOrigins, ","),
		AllowCredentials: true,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Request-ID, X-Tenant-Slug",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
		ExposeHeaders:    "X-Request-ID",
		MaxAge:           3600,
	}))

	// Session repo (baru)
	sessionDB := cbtSqliteRepo.NewSessionDB(db)
	tokenDB := cbtSqliteRepo.NewTokenDB(db)
	tokenUC := cbtUc.NewTokenUseCase(tokenDB, sessionDB)
	paymentDB := cbtSqliteRepo.NewPaymentDB(db)
	paymentUC := cbtUc.NewPaymentUseCase(paymentDB)

	credRepo := schedulingRepo.NewCredentialsDB(db)
	proctorDB := schedulingRepo.NewProctorDB(db)
	proctorUC := schedulingUc.NewProctorUseCase(proctorDB)
	participantAuthUC := schedulingUc.NewParticipantAuthUseCase(credRepo, credCipher)
	credentialsUC := schedulingUc.NewCredentialsUseCase(credRepo, credCipher)

	// ==========================================
	// 8. ROUTING & MIDDLEWARE WIRING
	// ==========================================
	handler := cbtHttp.NewCBTHandler(
		schedulingUC, adminLoginUC,
		participantAuthUC, credentialsUC, // ← NEW
		examUC, archiveUC, proctoringUC,
		sessionDB,
		tokenUC,
		proctorUC,
		paymentUC,
	)
	api := app.Group("/api/v1/cbt")

	// A. PUBLIC ROUTES (Tanpa Token)
	// Tier 1: login (paling ketat)
	authGroup := api.Group("/auth")
	authGroup.Post("/admin/login", middleware.RateLimiter(middleware.RateLogin), handler.HandleAdminLogin)
	authGroup.Post("/super/login", middleware.RateLimiter(middleware.RateLogin), handler.HandleSuperAdminLogin) // ← NEW
	authGroup.Post("/exam/login", middleware.RateLimiter(middleware.RateLogin), handler.HandleLogin)
	authGroup.Post("/proctor/login", middleware.RateLimiter(middleware.RateLogin), handler.HandleProctorLogin)

	// Super admin public endpoints (stub untuk single-tenant)
	superPub := api.Group("/super")
	superPub.Get("/schools", handler.HandleListSchools) // ← NEW
	superPub.Get("/schools/:slug/config", handler.HandleGetTenantConfig)
	// B. ADMIN ROUTES (Wajib JWT Admin)
	// admin := api.Group("/admin", middleware.JWTAuth())
	admin := api.Group("/admin", middleware.RequireRole("ADMIN", "SUPER_ADMIN"), middleware.RateLimiter(middleware.RateGeneral))
	admin.Get("/payments/blocked", handler.HandleListBlockedPayments) // ← NEW
	admin.Post("/payments/block", handler.HandleBlockPayment)         // ← NEW
	admin.Post("/payments/unblock", handler.HandleUnblockPayment)     // ← NEW
	admin.Post("/makeup/approve", handler.HandleApproveMakeup)        // ← NEW
	admin.Post("/sync", handler.HandleSync)
	admin.Get("/dashboard/stats", handler.HandleDashboardStats)
	// Admin/proctor token routes
	admin.Post("/session", handler.HandleCreateSession)
	admin.Get("/sessions", handler.HandleListSessions)
	admin.Get("/sessions/:sessionId/token", handler.HandleGetCurrentToken)
	admin.Post("/sessions/:sessionId/token/rotate", handler.HandleRotateTokenManual)
	admin.Post("/archive", handler.HandleArchive)
	admin.Post("/participants/import-external", handler.HandleImportExternalCSV)
	admin.Get("/questions/template", handler.HandleDownloadTemplate)
	// D1: credential management
	admin.Post("/credentials/generate", handler.HandleGenerateCredentials)
	admin.Get("/credentials/view", handler.HandleViewCredentials)
	admin.Get("/proctors", handler.HandleListProctors)          // ← NEW
	admin.Post("/proctors/assign", handler.HandleAssignProctor) // ← NEW

	// PROCTOR (+ ADMIN fallback)
	proctor := api.Group("/proctor", middleware.RequireRole("ADMIN", "PROCTOR", "TEACHER"))
	proctor.Get("/sessions", handler.HandleMyProctorSessions) // ← NEW
	proctor.Post("/unlock", handler.HandleUnlockParticipant)  // ← NEW

	// C. EXAM ROUTES (Wajib JWT Peserta + Cek Banned di Redis)
	// Tier 2: exam endpoints
	exam := api.Group("/exam", middleware.RateLimiter(middleware.RateGeneral), middleware.ExamAuth(rdb))
	exam.Get("/active", middleware.RateLimiter(middleware.RateGeneral), handler.HandleGetActiveExams)  // ← NEW
	exam.Get("/history", middleware.RateLimiter(middleware.RateGeneral), handler.HandleGetExamHistory) // ← NEW
	exam.Get("/timer", middleware.RateLimiter(middleware.RateGeneral), handler.HandleGetTimer)
	exam.Post("/:examId/verify-token", middleware.RateLimiter(middleware.RateVerifyToken), handler.HandleVerifyToken)
	exam.Post("/start", middleware.RateLimiter(middleware.RateGeneral), handler.HandleStartExam)
	exam.Post("/answer", middleware.RateLimiter(middleware.RateBatchAnswer), handler.HandleSubmitAnswer)
	exam.Post("/answers/batch", middleware.RateLimiter(middleware.RateBatchAnswer), handler.HandleBatchAnswer) // ← NEW
	exam.Post("/submit", middleware.RateLimiter(middleware.RateSubmit), handler.HandleFinishExam)
	exam.Post("/heartbeat", middleware.RateLimiter(middleware.RateGeneral), handler.HandleHeartbeat)
	exam.Post("/telemetry", middleware.RateLimiter(middleware.RateGeneral), handler.HandleTelemetry)
	exam.Get("/dashboard", handler.HandleParticipantDashboard)

	// Health Check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "OK", "service": "CBT Engine"})
	})
	rotatorCtx, rotatorCancel := context.WithCancel(context.Background())
	defer rotatorCancel()
	go cbtUc.StartTokenRotator(rotatorCtx, sessionDB, tokenUC)

	attendanceCtx, attendanceCancel := context.WithCancel(context.Background())
	defer attendanceCancel()
	go cbtUc.StartAttendanceWorker(attendanceCtx, db)

	// ==========================================
	// 9. GRACEFUL SHUTDOWN
	// ==========================================
	go func() {
		log.Info().Msgf("🌐 Server Gofiber CBT Engine berjalan di port %s", cfg.AppPort)
		if err := app.Listen(cfg.AppPort); err != nil {
			log.Fatal().Err(err).Msg("Server Gofiber CBT gagal diluncurkan")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("🛑 Menerima sinyal shutdown, membersihkan memori server...")

	// Tutup Redis dengan aman
	if err := rdb.Close(); err != nil {
		log.Error().Err(err).Msg("Error menutup Redis")
	}

	// Tutup Fiber dengan aman (Menunggu request yang sedang berlangsung selesai)
	if err := app.Shutdown(); err != nil {
		log.Error().Err(err).Msg("Error menutup Fiber")
	}

	log.Info().Msg("✅ CBT Test Engine Service berhasil dihentikan secara bersih.")
}
