package main

import (
	"context"
	"database/sql"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"cbt-engine-service/internal/archive/repository"
	archiveUc "cbt-engine-service/internal/archive/usecase"
	cbtHttp "cbt-engine-service/internal/cbt/delivery/http"
	cbtRedisRepo "cbt-engine-service/internal/cbt/repository/redis"
	cbtSqliteRepo "cbt-engine-service/internal/cbt/repository/sqlite"
	cbtUc "cbt-engine-service/internal/cbt/usecase"
	"cbt-engine-service/internal/config"
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
	auth.Init(cfg.JWTSecret)
	log.Info().Msg("✅ JWT Secret berhasil dimuat")

	// ==========================================
	// 5. REPOSITORY LAYER (Dependency Injection)
	// ==========================================
	// Scheduling
	siakadClient := schedulingRepo.NewSiakadSyncClient(cfg.SiakadBaseURL)
	localAuthDB := schedulingRepo.NewLocalAuthDB(db)

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

	// Untuk ExamUseCase, kita butuh interface ExternalService.
	// Di monolith, kita bisa langsung passing schedulingUC atau localAuthDB jika sudah memenuhi interface.
	// (Asumsi: schedulingUC sudah mengimplementasikan method ValidateParticipant)
	examUC := cbtUc.NewExamUseCase(examDB, examCache, examDB, examCache)

	proctoringUC := proctoringUc.NewProctoringUseCase(proctoringRedis)

	redisFlush := func() error { return rdb.FlushAll(context.Background()).Err() }
	archiveUC := archiveUc.NewArchiveUseCase(archiveDB, siakadClient, redisFlush)

	// ==========================================
	// 7. FIBER APP SETUP (HARDENED FOR VPS)
	// ==========================================
	app := fiber.New(fiber.Config{
		BodyLimit:    5 * 1024 * 1024,        // 5MB limit (Cegah spam upload CSV besar)
		Concurrency:  256 * runtime.NumCPU(), // Batasi goroutine agar RAM tidak jebol
		ReadTimeout:  15 * time.Second,       // Putus koneksi lambat
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second, // Bebaskan file descriptor
	})

	// CORS Dinamis
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigin,
		AllowCredentials: true,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
	}))

	// ==========================================
	// 8. ROUTING & MIDDLEWARE WIRING
	// ==========================================
	handler := cbtHttp.NewCBTHandler(schedulingUC, examUC, archiveUC, proctoringUC)
	api := app.Group("/api/v1/cbt")

	// A. PUBLIC ROUTES (Tanpa Token)
	authGroup := api.Group("/auth")
	authGroup.Post("/admin/login", handler.HandleAdminLogin)
	authGroup.Post("/exam/login", handler.HandleLogin)

	// B. ADMIN ROUTES (Wajib JWT Admin)
	admin := api.Group("/admin", middleware.JWTAuth())
	admin.Post("/sync", handler.HandleSync)
	admin.Post("/session", handler.HandleCreateSession)
	admin.Post("/archive", handler.HandleArchive)
	admin.Post("/participants/import-external", handler.HandleImportExternalCSV)
	admin.Get("/questions/template", handler.HandleDownloadTemplate)
	// C. EXAM ROUTES (Wajib JWT Peserta + Cek Banned di Redis)
	exam := api.Group("/exam", middleware.ExamAuth(rdb))
	exam.Post("/start", handler.HandleStartExam)
	exam.Post("/answer", handler.HandleSubmitAnswer)
	exam.Post("/submit", handler.HandleFinishExam)
	// exam.Post("/heartbeat", handler.HandleHeartbeat)
	// exam.Post("/telemetry", handler.HandleTelemetry)

	// Health Check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "OK", "service": "CBT Engine"})
	})

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
