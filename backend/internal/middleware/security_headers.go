package middleware

import (
	"github.com/gofiber/fiber/v2"
)

// SecurityHeaders — tambah header keamanan standar.
// Fungsi ini untuk API-only server. Kalau serve HTML juga, CSP perlu disesuaikan.
func SecurityHeaders(isProduction bool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Anti MIME sniffing
		c.Set("X-Content-Type-Options", "nosniff")
		// Anti clickjacking (API tidak boleh di-iframe)
		c.Set("X-Frame-Options", "DENY")
		// XSS protection (legacy browser)
		c.Set("X-XSS-Protection", "1; mode=block")
		// Referrer policy
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		// Feature policy — disable browser features
		c.Set("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=()")
		// API server — CSP minimal
		c.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")

		// HSTS — hanya kalau production (butuh HTTPS aktif)
		if isProduction {
			c.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		}

		return c.Next()
	}
}
