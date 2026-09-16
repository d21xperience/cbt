package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

// RateLimitConfig — presets untuk berbagai endpoint
type RateLimitConfig struct {
	Name       string
	Max        int
	Expiration time.Duration
}

// Preset configs — disesuaikan dengan CBT context
var (
	// Login: 5 attempts / 15 menit per IP
	RateLogin = RateLimitConfig{
		Name:       "login",
		Max:        5,
		Expiration: 15 * time.Minute,
	}

	// Verify token: 10 / 5 menit per IP (siswa salah input)
	RateVerifyToken = RateLimitConfig{
		Name:       "verify_token",
		Max:        10,
		Expiration: 5 * time.Minute,
	}

	// Autosave batch: 60 / menit (frontend kirim tiap 15s = 4/menit, kasih ruang)
	RateBatchAnswer = RateLimitConfig{
		Name:       "batch_answer",
		Max:        60,
		Expiration: 1 * time.Minute,
	}

	// Submit: 5 / menit (idempotent tapi batasi spam)
	RateSubmit = RateLimitConfig{
		Name:       "submit",
		Max:        5,
		Expiration: 1 * time.Minute,
	}

	// General: 200 / menit per IP (API umum)
	RateGeneral = RateLimitConfig{
		Name:       "general",
		Max:        200,
		Expiration: 1 * time.Minute,
	}
)

// RateLimiter — bangun middleware dari config
func RateLimiter(cfg RateLimitConfig) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        cfg.Max,
		Expiration: cfg.Expiration,
		// Key by IP only — bukan IP+path, biar satu IP punya batas gabungan
		KeyGenerator: func(c *fiber.Ctx) string {
			// Kalau sudah authenticated, key by userID — akurat untuk NAT
			if uid, ok := c.Locals("userID").(string); ok && uid != "" {
				return "u:" + uid
			}
			return "ip:" + c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			reqID, _ := c.Locals("requestid").(string)
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":      "rate_limit_exceeded",
				"message":    "Terlalu banyak permintaan. Coba lagi nanti.",
				"request_id": reqID,
				"retry_in":   cfg.Expiration.Seconds(),
			})
		},
	})
}
