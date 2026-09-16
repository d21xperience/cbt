package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

// RequestLogger — log request tanpa membocorkan secret.
// TIDAK log: body, Authorization header, cookie value.
// HANYA log: method, path, status, latency, IP, user-agent, request_id.
func RequestLogger() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		err := c.Next()

		reqID, _ := c.Locals("requestid").(string)
		userID, _ := c.Locals("userID").(string)
		role, _ := c.Locals("role").(string)

		evt := log.Info()
		if c.Response().StatusCode() >= 500 {
			evt = log.Error()
		} else if c.Response().StatusCode() >= 400 {
			evt = log.Warn()
		}

		evt.
			Str("request_id", reqID).
			Str("method", c.Method()).
			Str("path", c.Path()).
			Int("status", c.Response().StatusCode()).
			Dur("latency_ms", time.Since(start)).
			Str("ip", c.IP()).
			Str("user_agent", c.Get("User-Agent"))

		if userID != "" {
			evt = evt.Str("user_id", userID).Str("role", role)
		}
		if c.Query("exam_id") != "" {
			evt = evt.Str("exam_id", c.Query("exam_id"))
		}
		evt.Msg("http_request")

		return err
	}
}
