// internal/app/routes.go
package app

import (
	cbtHttp "cbt-engine-service/internal/cbt/delivery/http"
	"cbt-engine-service/internal/config"
	"cbt-engine-service/internal/middleware"
	platformRepo "cbt-engine-service/internal/platform/repository"

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
	app.Use(middleware.TenantResolver(infra.TenantUC, cfg.DefaultTenantSubdomain))
	log.Info().Msg("✅ TenantResolver (optional) aktif")

	// Build handler
	handler := newCBTHandler(infra)

	app.Use(middleware.EnsureResponseStatus("/api/v1/cbt/exam/"))

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
	// Buat keahlianDB dari PlatformDB (shared platform-level)
	keahlianDB := platformRepo.NewKeahlianDB(infra.PlatformDB)
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
		keahlianDB,
	)
	// Attach factory untuk tenant-scoped handlers (Phase 3A migration path)
	handler.SetFactory(infra.Factory, infra.TenantUC, infra.PlatformUser, infra.PlatformKeahlian)
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

	// === NEW BE-P1: Super admin approval queue ===
	platformPub.Get("/schools/pending",
		middleware.RequireRole("SUPER_ADMIN"),
		handler.HandleListPendingSchools,
	)
	platformPub.Post("/schools/:tenant_id/approve",
		middleware.RequireRole("SUPER_ADMIN"),
		handler.HandleApproveSchool,
	)
	platformPub.Post("/schools/:tenant_id/reject",
		middleware.RequireRole("SUPER_ADMIN"),
		handler.HandleRejectSchool,
	)
	// VER-009: Super admin program management (platform-scoped)
	platformPub.Get("/schools/:tenant_id/programs",
		middleware.RequireRole("SUPER_ADMIN"),
		middleware.RateLimiter(middleware.RateGeneral),
		handler.HandleSuperListTenantPrograms,
	)
	platformPub.Post("/schools/:tenant_id/programs/assign",
		middleware.RequireRole("SUPER_ADMIN"),
		middleware.RateLimiter(middleware.RateGeneral),
		handler.HandleSuperAssignProgram,
	)
	platformPub.Post("/schools/:tenant_id/programs/remove",
		middleware.RequireRole("SUPER_ADMIN"),
		middleware.RateLimiter(middleware.RateGeneral),
		handler.HandleSuperRemoveProgram,
	)

	// === Auth platform ===
	authPlatform := api.Group("/auth")
	authPlatform.Post("/super/login",
		middleware.RateLimiter(middleware.RateLogin),
		handler.HandleSuperAdminLogin,
	)

	// === NEW BE-P1 + BE-P2: Public endpoints ===
	public := api.Group("/public")
	public.Post("/schools/register",
		middleware.RateLimiter(middleware.RatePublicRegister),
		handler.HandlePublicRegisterSchool,
	)
	public.Get("/schools",
		middleware.RateLimiter(middleware.RatePublicList),
		handler.HandleListPublicSchools,
	)
	public.Get("/references/bidang-keahlian", handler.HandleListBidangKeahlian)
	public.Get("/references/program-keahlian",
		middleware.RateLimiter(middleware.RatePublicList),
		handler.HandleListProgramKeahlian,
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
		middleware.TenantGuard(), // ← NEW
		middleware.RateLimiter(middleware.RateGeneral),
	)
	registerAdminRoutes(admin, handler)

	// ---- Proctor routes ----
	proctor := tenantAPI.Group("/proctor",
		middleware.RequireRole("ADMIN", "PROCTOR", "TEACHER"),
		middleware.TenantGuard(), // ← NEW
	)
	registerProctorRoutes(proctor, handler)

	// ---- Exam routes ----
	exam := tenantAPI.Group("/exam",
		middleware.ExamAuth(infra.Redis),
		middleware.TenantGuard(), // ← NEW
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
	admin.Get("/exams", h.HandleListExams)
	admin.Post("/exams/find-or-create", h.HandleFindOrCreateExam)
	admin.Delete("/exams/:id", h.HandleDeleteExam)
	admin.Post("/session", h.HandleCreateSession)
	admin.Get("/sessions", h.HandleListSessions)
	admin.Get("/sessions/:sessionId/token", h.HandleGetCurrentToken)
	admin.Post("/sessions/:sessionId/token/rotate", h.HandleRotateTokenManual)
	admin.Post("/archive", h.HandleArchive)
	admin.Post("/participants/import-external", h.HandleImportExternalCSV)
	admin.Get("/exams/:id", h.HandleGetExam)
	admin.Get("/questions", h.HandleListQuestions)
	admin.Post("/questions", h.HandleCreateQuestion)
	admin.Put("/questions/:id", h.HandleUpdateQuestion)
	admin.Delete("/questions/:id", h.HandleDeleteQuestion)

	admin.Get("/questions/template", h.HandleDownloadTemplate)
	admin.Post("/credentials/generate", h.HandleGenerateCredentials)
	admin.Get("/credentials/view", h.HandleViewCredentials)
	admin.Get("/proctors", h.HandleListProctors)
	admin.Post("/proctors/assign", h.HandleAssignProctor)
	// VER-007: Master Program Keahlian (self-service admin tenant)
	admin.Post("/program-keahlian/find-or-create", h.HandleFindOrCreateProgram)
	admin.Get("/programs", h.HandleListTenantPrograms)
	admin.Post("/programs/assign", h.HandleAssignTenantProgram)
	admin.Post("/programs/remove", h.HandleRemoveTenantProgram)
	// BCR-1: Master Siswa
	admin.Get("/students", h.HandleListStudents)
	admin.Post("/students", h.HandleCreateStudent)
	admin.Put("/students/:id", h.HandleUpdateStudent)
	admin.Delete("/students/:id", h.HandleDeleteStudent)
	admin.Get("/students/template", h.HandleStudentsTemplate)
	admin.Post("/students/import", h.HandleImportStudents)

	// BCR-3: Master Kelas

	admin.Get("/classes", h.HandleListClasses)

	// FASE C.1: Academic Periods

	admin.Get("/academic-periods", h.HandleListAcademicPeriods)

	admin.Post("/academic-periods", h.HandleCreateAcademicPeriod)

	admin.Post("/academic-periods/:id/activate", h.HandleActivateAcademicPeriod)

	// BCR-4: Master Subjects

	admin.Get("/subjects", h.HandleListSubjects)

	// BCR-5: Master Exam Types

	admin.Get("/exam-types", h.HandleListExamTypes)

	// BCR-6: Master Lessons (Pembelajaran)

	admin.Get("/lessons", h.HandleListLessons)

	// BCR-7: Exam Schedules

	admin.Get("/exam-schedules", h.HandleListExamSchedules)

	admin.Post("/exam-schedules", h.HandleCreateExamSchedule)

	admin.Put("/exam-schedules/:id", h.HandleUpdateExamSchedule)

	admin.Delete("/exam-schedules/:id", h.HandleDeleteExamSchedule)

	admin.Delete("/exam-schedules/:id", h.HandleDeleteExamSchedule)

	admin.Post("/lessons", h.HandleCreateLesson)

	admin.Put("/lessons/:id", h.HandleUpdateLesson)

	admin.Delete("/lessons/:id", h.HandleDeleteLesson)

	admin.Get("/lessons/template", h.HandleLessonsTemplate)

	admin.Post("/lessons/import", h.HandleImportLessons)

	admin.Post("/exam-types", h.HandleCreateExamType)

	admin.Put("/exam-types/:id", h.HandleUpdateExamType)

	admin.Delete("/exam-types/:id", h.HandleDeleteExamType)

	admin.Get("/exam-types/template", h.HandleExamTypesTemplate)

	admin.Post("/exam-types/import", h.HandleImportExamTypes)

	admin.Post("/subjects", h.HandleCreateSubject)

	admin.Put("/subjects/:id", h.HandleUpdateSubject)

	admin.Delete("/subjects/:id", h.HandleDeleteSubject)

	admin.Get("/subjects/template", h.HandleSubjectsTemplate)

	admin.Post("/subjects/import", h.HandleImportSubjects)

	admin.Get("/teachers", h.HandleListTeachers)
	admin.Post("/teachers", h.HandleCreateTeacher)

	// Rute statis HARUS di atas rute dinamis (:id) di Fiber
	admin.Get("/teachers/template", h.HandleTeachersTemplate)
	admin.Post("/teachers/import", h.HandleImportTeachers)

	// Rute dinamis
	admin.Put("/teachers/:id", h.HandleUpdateTeacher)
	admin.Post("/teachers/:id/reset-password", h.HandleResetTeacherPassword)
	admin.Delete("/teachers/:id", h.HandleDeleteTeacher)

	admin.Put("/rooms/:id", h.HandleUpdateRoom)

	admin.Delete("/rooms/:id", h.HandleDeleteRoom)

	admin.Get("/rooms", h.HandleListRooms)

	admin.Post("/rooms", h.HandleCreateRoom)

	admin.Post("/classes", h.HandleCreateClass)

	admin.Put("/classes/:id", h.HandleUpdateClass)

	admin.Delete("/classes/:id", h.HandleDeleteClass)

	admin.Get("/classes/template", h.HandleClassesTemplate)

	admin.Post("/classes/import", h.HandleImportClasses)

	// BCR-2: School Profile

	admin.Get("/school-profile", h.HandleGetSchoolProfile)

	admin.Put("/school-profile", h.HandleUpdateSchoolProfile)

	// BCR-1: Participants (derived)
	admin.Get("/participants", h.HandleListParticipants)
	admin.Get("/cards", h.HandleGetExamCards)
	admin.Post("/exam-mode", h.HandleToggleExamMode)
	admin.Post("/cards/:id/mark-printed", h.HandleMarkCardPrinted)
	admin.Post("/cards/:nis/revoke", h.HandleRevokeCard)
	admin.Post("/cards/:nis/reset-device", h.HandleResetDevice)
	admin.Post("/cards/:nis/generate-qr", h.HandleGenerateQrToken)
	admin.Post("/participants/:id/reset-password", h.HandleResetParticipantPassword)
}

func registerProctorRoutes(proctor fiber.Router, h *cbtHttp.CBTHandler) {
	proctor.Get("/sessions", h.HandleMyProctorSessions)
	proctor.Post("/unlock", h.HandleUnlockParticipant)
}

func registerExamRoutes(exam fiber.Router, h *cbtHttp.CBTHandler) {
	exam.Get("/active", h.HandleGetActiveExams)
	exam.Get("/history", h.HandleGetExamHistory)
	exam.Get("/timer", middleware.RequireExamToken(), h.HandleGetTimer)
	exam.Post("/:examId/verify-token",
		middleware.RateLimiter(middleware.RateVerifyToken),
		h.HandleVerifyToken,
	)
	exam.Post("/start", middleware.RequireExamToken(), h.HandleStartExam)
	exam.Post("/answer",
		middleware.RequireExamToken(),
		middleware.RateLimiter(middleware.RateBatchAnswer),
		h.HandleSubmitAnswer,
	)
	exam.Post("/answers/batch",
		middleware.RequireExamToken(),
		middleware.RateLimiter(middleware.RateBatchAnswer),
		h.HandleBatchAnswer,
	)
	exam.Post("/submit",
		middleware.RequireExamToken(),
		middleware.RateLimiter(middleware.RateSubmit),
		h.HandleFinishExam,
	)
	exam.Post("/heartbeat", middleware.RequireExamToken(), h.HandleHeartbeat)
	exam.Post("/telemetry", middleware.RequireExamToken(), h.HandleTelemetry)
	exam.Get("/dashboard", h.HandleParticipantDashboard)
}
