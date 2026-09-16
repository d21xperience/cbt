package middleware

import (
	"fmt"
	"runtime/debug"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

// Recover — custom panic recovery.
// Tujuan: JANGAN expose stacktrace ke client, tapi LOG ke server.
func Recover() fiber.Handler {
	return func(c *fiber.Ctx) error {
		defer func() {
			if r := recover(); r != nil {
				reqID := c.Locals("requestid")

				log.Error().
					Interface("request_id", reqID).
					Str("method", c.Method()).
					Str("path", c.Path()).
					Interface("panic", r).
					Bytes("stack", debug.Stack()).
					Msg("PANIC RECOVERED")

				// Response generik ke client — TANPA stacktrace
				_ = c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error":      "internal_server_error",
					"message":    "Terjadi kesalahan internal. Hubungi administrator.",
					"request_id": reqID,
				})
			}
		}()
		return c.Next()
	}
}

// Dipakai oleh helper lain kalau butuh
var _ = fmt.Sprintf
