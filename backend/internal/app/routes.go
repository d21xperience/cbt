// internal/app/routes.go
package app

import (
	cbtHttp "cbt-engine-service/internal/cbt/delivery/http"
	"cbt-engine-service/internal/config"
	"cbt-engine-service/internal/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

// RegisterRoutes — register semua route dengan scope separation.
//
// Scope:
//   - PLATFORM: /super/*, /auth/super/login  → tanpa tenant
//   - TENANT:   /auth/{admin,exam,proctor}/login, /admin/*, /proctor/*, /exam/*
//     → wajib tenant via RequireTenant()
func RegisterRoutes(app *fiber.App, cfg config.Config, infra *Infrastructure) *cbtHttp.CBTHandler {
	// Global: TenantResolver (OPTIONAL — tidak fail kalau tidak ada tenant)
	app.Use(middleware.TenantResolver(infra.TenantUC, infra.TenantMgr))
	log.Info().Msg("✅ TenantResolver (optional) aktif")

	// Build handler
	handler := newCBTHandler(infra)

	api := app.Group("/api/v1/cbt")

	// ============================================
	// PLATFORM SCOPE (no tenant required)
	// ============================================
	registerPlatformRoutes(api, handler)

	// ============================================
	// TENANT SCOPE (tenant required)
	// ============================================
	tenantAPI := api.Group("", middleware.RequireTenant())
	registerTenantRoutes(tenantAPI, handler, infra)

	return handler
}

func newCBTHandler(infra *Infrastructure) *cbtHttp.CBTHandler {
	d := infra.HandlerDeps

	handler := cbtHttp.NewCBTHandler(
		d.SchedulingUC,
		d.AdminLoginUC,
		d.ParticipantAuthUC,
		d.CredentialsUC,
		d.ExamUC,
		d.ArchiveUC,
		d.ProctoringUC,
		d.SessionDB,
		d.TokenUC,
		d.ProctorUC,
		d.PaymentUC,
	)
	// Attach factory untuk tenant-scoped handlers (Phase 3A migration path)
	handler.SetFactory(infra.Factory, infra.TenantUC, infra.PlatformUser)
	log.Info().Msg("✅ Handler + factory siap")

	return handler
}

// ============================================
// PLATFORM SCOPE
// ============================================
func registerPlatformRoutes(api fiber.Router, handler *cbtHttp.CBTHandler) {
	platformPub := api.Group("/super")
	platformPub.Get("/schools", handler.HandleListSchools)
	platformPub.Get("/schools/:slug/config", handler.HandleGetTenantConfig)

	authPlatform := api.Group("/auth")
	authPlatform.Post("/super/login",
		middleware.RateLimiter(middleware.RateLogin),
		handler.HandleSuperAdminLogin,
	)
}

// ============================================
// TENANT SCOPE
// ============================================
func registerTenantRoutes(tenantAPI fiber.Router, handler *cbtHttp.CBTHandler, infra *Infrastructure) {
	// ---- Auth tenant ----
	authTenant := tenantAPI.Group("/auth")
	authTenant.Post("/admin/login",
		middleware.RateLimiter(middleware.RateLogin),
		handler.HandleAdminLogin,
	)
	authTenant.Post("/exam/login",
		middleware.RateLimiter(middleware.RateLogin),
		handler.HandleLogin,
	)
	authTenant.Post("/proctor/login",
		middleware.RateLimiter(middleware.RateLogin),
		handler.HandleProctorLogin,
	)

	// ---- Admin routes ----
	admin := tenantAPI.Group("/admin",
		middleware.RequireRole("ADMIN", "SUPER_ADMIN"),
		middleware.RateLimiter(middleware.RateGeneral),
	)
	registerAdminRoutes(admin, handler)

	// ---- Proctor routes ----
	proctor := tenantAPI.Group("/proctor",
		middleware.RequireRole("ADMIN", "PROCTOR", "TEACHER"),
	)
	registerProctorRoutes(proctor, handler)

	// ---- Exam routes ----
	exam := tenantAPI.Group("/exam",
		middleware.ExamAuth(infra.Redis),
		middleware.RateLimiter(middleware.RateGeneral),
	)
	registerExamRoutes(exam, handler)
}

func registerAdminRoutes(admin fiber.Router, h *cbtHttp.CBTHandler) {
	admin.Get("/payments/blocked", h.HandleListBlockedPayments)
	admin.Post("/payments/block", h.HandleBlockPayment)
	admin.Post("/payments/unblock", h.HandleUnblockPayment)
	admin.Post("/makeup/approve", h.HandleApproveMakeup)
	admin.Post("/sync", h.HandleSync)
	admin.Get("/dashboard/stats", h.HandleDashboardStats)
	admin.Post("/session", h.HandleCreateSession)
	admin.Get("/sessions", h.HandleListSessions)
	admin.Get("/sessions/:sessionId/token", h.HandleGetCurrentToken)
	admin.Post("/sessions/:sessionId/token/rotate", h.HandleRotateTokenManual)
	admin.Post("/archive", h.HandleArchive)
	admin.Post("/participants/import-external", h.HandleImportExternalCSV)
	admin.Get("/questions/template", h.HandleDownloadTemplate)
	admin.Post("/credentials/generate", h.HandleGenerateCredentials)
	admin.Get("/credentials/view", h.HandleViewCredentials)
	admin.Get("/proctors", h.HandleListProctors)
	admin.Post("/proctors/assign", h.HandleAssignProctor)
}

func registerProctorRoutes(proctor fiber.Router, h *cbtHttp.CBTHandler) {
	proctor.Get("/sessions", h.HandleMyProctorSessions)
	proctor.Post("/unlock", h.HandleUnlockParticipant)
}

func registerExamRoutes(exam fiber.Router, h *cbtHttp.CBTHandler) {
	exam.Get("/active", h.HandleGetActiveExams)
	exam.Get("/history", h.HandleGetExamHistory)
	exam.Get("/timer", h.HandleGetTimer)
	exam.Post("/:examId/verify-token",
		middleware.RateLimiter(middleware.RateVerifyToken),
		h.HandleVerifyToken,
	)
	exam.Post("/start", h.HandleStartExam)
	exam.Post("/answer",
		middleware.RateLimiter(middleware.RateBatchAnswer),
		h.HandleSubmitAnswer,
	)
	exam.Post("/answers/batch",
		middleware.RateLimiter(middleware.RateBatchAnswer),
		h.HandleBatchAnswer,
	)
	exam.Post("/submit",
		middleware.RateLimiter(middleware.RateSubmit),
		h.HandleFinishExam,
	)
	exam.Post("/heartbeat", h.HandleHeartbeat)
	exam.Post("/telemetry", h.HandleTelemetry)
	exam.Get("/dashboard", h.HandleParticipantDashboard)
}
