package middleware

import (
	"crypto/sha256"
	"encoding/hex"
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
	// QR login: 2 lapis — per-token (anti-spam) + per-IP longgar (anti-flood).
	RateQrLoginToken = RateLimitConfig{Name: "qr_login_token", Max: 10, Expiration: 15 * time.Minute}
	RateQrLoginIP    = RateLimitConfig{Name: "qr_login_ip", Max: 300, Expiration: 1 * time.Minute}
)

// buildLimitReached — handler 429 yang konsisten
func buildLimitReached(cfg RateLimitConfig) fiber.Handler {
	return func(c *fiber.Ctx) error {
		reqID, _ := c.Locals("requestid").(string)
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error":      "rate_limit_exceeded",
			"message":    "Terlalu banyak permintaan. Coba lagi nanti.",
			"request_id": reqID,
			"retry_in":   cfg.Expiration.Seconds(),
		})
	}
}

// isLoadTestRequest — skip rate limit kalau header match env LOAD_TEST_TOKEN
func isLoadTestRequest(c *fiber.Ctx) bool {
	expected := os.Getenv("LOAD_TEST_TOKEN")
	if expected == "" {
		return false
	}
	return c.Get("X-Load-Test-Token") == expected
}

// RateLimiter — limiter default (per-userID kalau sudah login, else per-IP).
func RateLimiter(cfg RateLimitConfig) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        cfg.Max,
		Expiration: cfg.Expiration,
		Next: func(c *fiber.Ctx) bool {
			return isLoadTestRequest(c)
		},
		KeyGenerator: func(c *fiber.Ctx) string {
			if uid, ok := c.Locals("userID").(string); ok && uid != "" {
				return "u:" + uid
			}
			return "ip:" + c.IP()
		},
		LimitReached: buildLimitReached(cfg),
	})
}

// RateLimiterWithKey — limiter dengan KeyGenerator kustom.
// Dipakai untuk /qr-login agar tidak memblokir scan massal di balik NAT.
func RateLimiterWithKey(cfg RateLimitConfig, keyFn func(*fiber.Ctx) string) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        cfg.Max,
		Expiration: cfg.Expiration,
		Next: func(c *fiber.Ctx) bool {
			return isLoadTestRequest(c)
		},
		KeyGenerator: keyFn,
		LimitReached: buildLimitReached(cfg),
	})
}

// QrLoginTokenKey — key = hash(body) (per token QR). Body di-hash mentah,
// tidak di-parse, sehingga aman dipanggil berulang & tidak mengonsumsi body.
func QrLoginTokenKey() func(*fiber.Ctx) string {
	return func(c *fiber.Ctx) string {
		body := c.Body()
		if len(body) == 0 {
			return "qr:empty:" + c.IP()
		}
		sum := sha256.Sum256(body)
		return "qr:" + hex.EncodeToString(sum[:])[:16]
	}
}

// IPKey — key = ip (untuk lapis longgar).
func IPKey() func(*fiber.Ctx) string {
	return func(c *fiber.Ctx) string {
		return "ip:" + c.IP()
	}
}
