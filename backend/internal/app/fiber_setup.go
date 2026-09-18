// internal/app/fiber_setup.go
package app

import (
	"net/http"
	"strings"
	"time"

	"cbt-engine-service/internal/config"
	"cbt-engine-service/internal/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/rs/zerolog/log"
)

// SetupFiber — Fiber config + global middleware + CORS.
// TenantResolver di-apply di RegisterRoutes (butuh infra).
func SetupFiber(cfg config.Config) *fiber.App {
	app := fiber.New(fiber.Config{
		BodyLimit:       5 * 1024 * 1024,
		Concurrency:     4096,
		ReadBufferSize:  16384,
		WriteBufferSize: 16384,
		ReadTimeout:     15 * time.Second,
		WriteTimeout:    15 * time.Second,
		IdleTimeout:     60 * time.Second,
		ErrorHandler:    globalErrorHandler,
	})

	// Middleware global (urutan kritis)
	app.Use(middleware.RequestID())
	app.Use(middleware.Recover())
	app.Use(middleware.SecurityHeaders(cfg.IsProduction()))
	app.Use(middleware.RequestLogger())

	// CORS (harus setelah request logger, sebelum routes)
	setupCORS(app, cfg)

	// Health check (public, no tenant)
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "OK", "service": "CBT Engine"})
	})

	return app
}

func globalErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	reqID, _ := c.Locals("requestid").(string)
	return c.Status(code).JSON(fiber.Map{
		"error":      http.StatusText(code),
		"request_id": reqID,
	})
}

func setupCORS(app *fiber.App, cfg config.Config) {
	if strings.TrimSpace(cfg.AllowedOrigin) == "" {
		log.Fatal().Msg("ALLOWED_ORIGIN kosong di .env")
	}

	origins := strings.Split(cfg.AllowedOrigin, ",")
	cleaned := make([]string, 0, len(origins))
	for _, o := range origins {
		o = strings.TrimSpace(o)
		if o == "" {
			continue
		}
		if o == "*" {
			log.Fatal().Msg("ALLOWED_ORIGIN tidak boleh '*'. Sebutkan origin spesifik.")
		}
		cleaned = append(cleaned, o)
	}
	if len(cleaned) == 0 {
		log.Fatal().Msg("ALLOWED_ORIGIN tidak menghasilkan origin valid")
	}
	log.Info().Strs("cors_origins", cleaned).Msg("CORS origins loaded")

	app.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Join(cleaned, ","),
		AllowCredentials: true,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Request-ID, X-Tenant-Slug",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
		ExposeHeaders:    "X-Request-ID",
		MaxAge:           3600,
	}))
}
