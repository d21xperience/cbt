// internal/middleware/auth.go
package middleware

import (
	"cbt-engine-service/pkg/auth"
	"context"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

// JWTAuth adalah middleware untuk Admin
func JWTAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		return validateJWT(c, "ADMIN", nil)
	}
}

// ExamAuth adalah middleware untuk Peserta Ujian
// Kita oper redisClient untuk mengecek status banned/disqualified
func ExamAuth(redisClient *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		return validateJWT(c, "PARTICIPANT", redisClient)
	}
}

func validateJWT(c *fiber.Ctx, requiredRole string, redisClient *redis.Client) error {
	// 1. Ambil Header Authorization
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token otorisasi tidak ditemukan"})
	}

	// 2. Format harus "Bearer <token>"
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Format token tidak valid"})
	}

	// 3. Parse & Validasi Token
	claims, err := auth.ParseToken(parts[1])
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token kadaluarsa atau tidak valid"})
	}

	// 4. Cek Role
	if claims.Role != requiredRole {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Akses ditolak: Role tidak sesuai"})
	}

	// 5. (KHUSUS PESERTA) Cek Status Banned/Disqualified di Redis
	if requiredRole == "PARTICIPANT" && redisClient != nil {
		banKey := "banned:" + claims.ExamID + ":" + claims.UserID
		isBanned, _ := redisClient.Exists(context.Background(), banKey).Result()

		if isBanned > 0 {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":  "Sesi ujian Anda telah dihentikan karena pelanggaran.",
				"action": "FORCE_SUBMIT",
			})
		}
	}

	// 6. Simpan Claims di Locals agar bisa dipakai di Handler tanpa parse ulang
	c.Locals("userID", claims.UserID)
	c.Locals("role", claims.Role)
	c.Locals("examID", claims.ExamID)

	return c.Next()
}
