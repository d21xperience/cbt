package middleware

import (
	"context"
	"strings"

	"cbt-engine-service/pkg/auth"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

// JWTAuth — backward compat, ADMIN only
func JWTAuth() fiber.Handler {
	return RequireRole("ADMIN")
}

// ExamAuth — backward compat, PARTICIPANT + ban check
func ExamAuth(redisClient *redis.Client) fiber.Handler {
	return RequireRoleWithBan("PARTICIPANT", redisClient)
}

// RequireRole — flexible role check
func RequireRole(roles ...string) fiber.Handler {
	return validateJWT(roles, nil)
}

// RequireRoleWithBan — sama + Redis ban check untuk participant
func RequireRoleWithBan(role string, redisClient *redis.Client) fiber.Handler {
	return validateJWT([]string{role}, redisClient)
}

func validateJWT(allowedRoles []string, redisClient *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token otorisasi tidak ditemukan"})
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Format token tidak valid"})
		}

		claims, err := auth.ParseToken(parts[1])
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token kadaluarsa atau tidak valid"})
		}

		// Role check
		allowed := false
		for _, r := range allowedRoles {
			if claims.Role == r {
				allowed = true
				break
			}
		}
		if !allowed {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Akses ditolak: Role tidak sesuai"})
		}

		// Ban check untuk participant
		if claims.Role == "PARTICIPANT" && redisClient != nil && claims.ExamID != "" {
			banKey := "banned:" + claims.ExamID + ":" + claims.UserID
			if isBanned, _ := redisClient.Exists(context.Background(), banKey).Result(); isBanned > 0 {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error":  "Sesi ujian Anda telah dihentikan karena pelanggaran.",
					"action": "FORCE_SUBMIT",
				})
			}
		}

		c.Locals("userID", claims.UserID)
		c.Locals("role", claims.Role)
		c.Locals("examID", claims.ExamID)
		c.Locals("tenantID", claims.TenantID)
		return c.Next()
	}
}
