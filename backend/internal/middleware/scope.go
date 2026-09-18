package middleware

import (
	"cbt-engine-service/internal/tenant"

	"github.com/gofiber/fiber/v2"
)

// RequireTenant — middleware untuk tenant-scoped routes.
// Fail 400 kalau tenant context tidak ada.
func RequireTenant() fiber.Handler {
	return func(c *fiber.Ctx) error {
		info := tenant.FromContext(c.UserContext())
		if info == nil || info.TenantID == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "tenant_required",
				"message": "Endpoint ini membutuhkan tenant yang valid. " +
					"Akses melalui subdomain tenant atau sertakan X-Tenant-Slug.",
			})
		}
		return c.Next()
	}
}

// OptionalTenant — marker middleware untuk platform routes.
// Tidak mem-block, hanya dokumentasi & future-proof.
func OptionalTenant() fiber.Handler {
	return func(c *fiber.Ctx) error {
		return c.Next()
	}
}
