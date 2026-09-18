package middleware

import (
	"context"
	"strings"

	platformUC "cbt-engine-service/internal/platform/usecase"
	"cbt-engine-service/internal/tenant"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

// TenantResolver — resolve tenant dari subdomain/host, simpan di Go context.
//
// Setelah middleware ini:
// - c.UserContext() contains tenant info (via tenant.WithTenantInfo)
// - c.Locals("tenant_id") untuk fiber-only access (backward compat)
func TenantResolver(tenantUC *platformUC.TenantUseCase, mgr *tenant.Manager) fiber.Handler {
	return func(c *fiber.Ctx) error {
		subdomain := extractSubdomain(c)

		if subdomain == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "tenant_not_identified",
				"message": "Host header tidak valid atau X-Tenant-Slug kosong",
			})
		}

		ctx := c.Context()
		resolution, err := tenantUC.ResolveBySubdomain(ctx, subdomain)
		if err != nil {
			log.Warn().
				Str("subdomain", subdomain).
				Err(err).
				Msg("Tenant resolution failed")

			status := fiber.StatusNotFound
			code := "tenant_not_found"
			switch err {
			case platformUC.ErrTenantSuspended:
				status = fiber.StatusForbidden
				code = "tenant_suspended"
			case platformUC.ErrTenantInactive:
				status = fiber.StatusForbidden
				code = "tenant_inactive"
			case platformUC.ErrSubdomainInvalid:
				status = fiber.StatusBadRequest
				code = "subdomain_invalid"
			}
			return c.Status(status).JSON(fiber.Map{
				"error":   code,
				"message": err.Error(),
			})
		}

		// === Set in Go context (PRIMARY) ===
		userCtx := c.UserContext()
		if userCtx == nil {
			userCtx = context.Background()
		}
		userCtx = tenant.WithTenantInfo(userCtx, &tenant.TenantInfo{
			TenantID:  resolution.TenantID,
			Subdomain: resolution.Subdomain,
			DBPath:    resolution.DBPath,
		})
		c.SetUserContext(userCtx)

		// === Also set in Locals (BACKWARD COMPAT untuk handler yang belum di-refactor) ===
		c.Locals("tenant_id", resolution.TenantID)
		c.Locals("tenant_subdomain", resolution.Subdomain)
		c.Locals("tenant_db_path", resolution.DBPath)

		return c.Next()
	}
}

// extractSubdomain — sama seperti sebelumnya
func extractSubdomain(c *fiber.Ctx) string {
	if slug := strings.TrimSpace(strings.ToLower(c.Get("X-Tenant-Slug"))); slug != "" {
		return slug
	}

	host := strings.ToLower(c.Hostname())
	if idx := strings.Index(host, ":"); idx >= 0 {
		host = host[:idx]
	}

	if host == "localhost" || host == "127.0.0.1" {
		return c.Query("tenant", "default")
	}

	parts := strings.Split(host, ".")
	if len(parts) >= 3 {
		return parts[0]
	}

	return "default"
}
