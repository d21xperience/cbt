package middleware

import (
	"context"
	"fmt"
	"strings"

	platformUC "cbt-engine-service/internal/platform/usecase"
	"cbt-engine-service/internal/tenant"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

// TenantResolver — resolve tenant dari subdomain/host, set di Go context.
// TIDAK fail kalau tenant tidak bisa di-resolve (biarkan RequireTenant yang handle).
//
// defaultSubdomain: fallback untuk localhost / root domain (config-driven).
func TenantResolver(
	tenantUC *platformUC.TenantUseCase,
	defaultSubdomain string,
) fiber.Handler {
	return func(c *fiber.Ctx) error {
		subdomain := extractSubdomain(c, defaultSubdomain)

		ctx := c.Context()
		resolution, err := tenantUC.ResolveBySubdomain(ctx, subdomain)
		if err != nil {
			log.Debug().
				Str("subdomain", subdomain).
				Err(err).
				Msg("Tenant resolution soft-failed")

			c.Locals("tenant_resolve_error", err.Error())
			return c.Next()
		}

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

		// Backward-compat Locals
		c.Locals("tenant_id", resolution.TenantID)
		c.Locals("tenant_subdomain", resolution.Subdomain)
		c.Locals("tenant_db_path", resolution.DBPath)

		return c.Next()
	}
}

// TenantGuard — enforce JWT tenant == server-resolved tenant.
//
// HARUS dipakai setelah JWTAuth/RequireRole.
//
// Behavior:
//   - JWT tenant == resolved tenant → PASS
//   - JWT tenant != resolved tenant → 403 tenant_mismatch
//   - JWT tenant kosong:
//   - role SUPER_ADMIN → PASS (platform-wide)
//   - role lain → 403 jwt_tenant_missing
func TenantGuard() fiber.Handler {
	return func(c *fiber.Ctx) error {
		jwtTenantID, _ := c.Locals("tenantID").(string)

		if jwtTenantID == "" {
			role, _ := c.Locals("role").(string)
			if role == "SUPER_ADMIN" {
				return c.Next()
			}
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   "jwt_tenant_missing",
				"message": "Token tidak memiliki identitas tenant",
			})
		}

		resolvedInfo := tenant.FromContext(c.UserContext())
		if resolvedInfo == nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "tenant_unresolved",
				"message": "Tidak dapat menentukan tenant dari request",
			})
		}

		if jwtTenantID != resolvedInfo.TenantID {
			log.Warn().
				Str("jwt_tenant", jwtTenantID).
				Str("resolved_tenant", resolvedInfo.TenantID).
				Str("path", c.Path()).
				Msg("Tenant mismatch — potential cross-tenant attempt")

			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   "tenant_mismatch",
				"message": "Tenant pada token tidak sesuai dengan request context",
			})
		}

		return c.Next()
	}
}

// ============================================
// extractSubdomain v2
// ============================================

// extractSubdomain — priority: Host subdomain > X-Tenant-Slug > ?tenant= > config default.
//
// Handles:
//   - Single-level subdomain: smkjaya.ujian.pw → "smkjaya"
//   - Multi-level subdomain: admin.smkjaya.ujian.pw → "smkjaya"
//   - IP address: 192.168.1.10 → fallback
//   - Localhost: localhost / 127.0.0.1 → fallback
//   - Root domain: ujian.pw → fallback
func extractSubdomain(c *fiber.Ctx, defaultSubdomain string) string {
	// 1. Host header
	host := strings.ToLower(c.Hostname())
	if idx := strings.Index(host, ":"); idx >= 0 {
		host = host[:idx]
	}

	// Skip localhost + IP addresses
	if host != "localhost" && host != "127.0.0.1" && !isIPAddress(host) {
		parts := strings.Split(host, ".")

		if len(parts) >= 3 {
			first := parts[0]

			// Multi-level: admin.smkjaya.ujian.pw → return parts[1]
			if isReservedPrefix(first) && len(parts) >= 4 {
				return parts[1]
			}
			// Single-level: smkjaya.ujian.pw → return parts[0]
			return first
		}
	}

	// 2. X-Tenant-Slug header
	if slug := strings.TrimSpace(strings.ToLower(c.Get("X-Tenant-Slug"))); slug != "" {
		return slug
	}

	// 3. Query param
	if q := strings.TrimSpace(strings.ToLower(c.Query("tenant"))); q != "" {
		return q
	}

	// 4. Config fallback
	if defaultSubdomain == "" {
		defaultSubdomain = "default"
	}
	return defaultSubdomain
}

// isIPAddress — detect IPv4 address.
func isIPAddress(host string) bool {
	parts := strings.Split(host, ".")
	if len(parts) != 4 {
		return false
	}
	for _, p := range parts {
		var n int
		if _, err := fmt.Sscanf(p, "%d", &n); err != nil {
			return false
		}
		if n < 0 || n > 255 {
			return false
		}
	}
	return true
}

// isReservedPrefix — system prefix yang dipakai untuk subdomain tambahan.
func isReservedPrefix(prefix string) bool {
	switch prefix {
	case "www", "api", "admin", "super", "auth",
		"exam", "proctor", "platform", "cbt", "app", "mail":
		return true
	}
	return false
}
