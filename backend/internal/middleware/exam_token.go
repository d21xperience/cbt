package middleware

import (
	"strings"

	"cbt-engine-service/pkg/auth"

	"github.com/gofiber/fiber/v2"
)

// RequireExamToken memvalidasi X-Exam-Token (JWT-B) untuk endpoint runtime /exam/*.
//
// Perilaku:
//   - Sumber utama: header "X-Exam-Token" (dikirim axios.js hanya untuk /exam/* selain /verify-token).
//   - Fallback: header "Authorization: Bearer <token>" (defense-in-depth, misal saat curl manual).
//   - Wajib: Role == "PARTICIPANT" DAN ExamID != "" (JWT-B terikat ke 1 ujian).
//   - Override Locals("userID"), Locals("examID"), Locals("role"), Locals("tenantID") dari claims JWT-B
//     sehingga handler di /exam/* membaca identitas yang benar (bukan JWT-A yang ExamID-nya kosong).
//
// Lihat: backend/internal/app/routes.go (registerExamRoutes) — middleware ini dipasang setelah
// ExamAuth (JWT-A) di level group, atau menggantikannya untuk route yang butuh exam-scope ketat.
func RequireExamToken() fiber.Handler {
	return func(c *fiber.Ctx) error {
		raw := strings.TrimSpace(c.Get("X-Exam-Token"))
		if raw == "" {
			authHeader := c.Get("Authorization")
			if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
				raw = strings.TrimSpace(authHeader[7:])
			}
		}
		if raw == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "X-Exam-Token wajib untuk endpoint runtime ujian",
			})
		}

		claims, err := auth.ParseToken(raw)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Token ujian tidak valid atau kadaluarsa",
			})
		}
		if claims.Role != "PARTICIPANT" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Token ujian bukan milik peserta",
			})
		}
		if claims.ExamID == "" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Token tidak terikat ke ujian (JWT-B wajib). Lakukan verify-token terlebih dahulu.",
			})
		}

		c.Locals("userID", claims.UserID)
		c.Locals("role", claims.Role)
		c.Locals("examID", claims.ExamID)
		c.Locals("tenantID", claims.TenantID)
		return c.Next()
	}
}
