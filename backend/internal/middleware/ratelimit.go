package middleware

import (
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

type RateLimitConfig struct {
	Name       string
	Max        int
	Expiration time.Duration
}

var (
	RateLogin          = RateLimitConfig{Name: "login", Max: 5, Expiration: 15 * time.Minute}
	RateVerifyToken    = RateLimitConfig{Name: "verify_token", Max: 10, Expiration: 5 * time.Minute}
	RateBatchAnswer    = RateLimitConfig{Name: "batch_answer", Max: 60, Expiration: 1 * time.Minute}
	RateSubmit         = RateLimitConfig{Name: "submit", Max: 5, Expiration: 1 * time.Minute}
	RateGeneral        = RateLimitConfig{Name: "general", Max: 200, Expiration: 1 * time.Minute}
	RatePublicRegister = RateLimitConfig{Name: "public_register", Max: 5, Expiration: 1 * time.Hour}
	RatePublicList     = RateLimitConfig{Name: "public_list", Max: 60, Expiration: 1 * time.Minute}
)

// isLoadTestRequest — skip rate limit kalau header match env LOAD_TEST_TOKEN
func isLoadTestRequest(c *fiber.Ctx) bool {
	expected := os.Getenv("LOAD_TEST_TOKEN")
	if expected == "" {
		return false
	}
	return c.Get("X-Load-Test-Token") == expected
}

func RateLimiter(cfg RateLimitConfig) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        cfg.Max,
		Expiration: cfg.Expiration,
		// ✅ Skip kalau load test request
		Next: func(c *fiber.Ctx) bool {
			return isLoadTestRequest(c)
		},
		KeyGenerator: func(c *fiber.Ctx) string {
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
