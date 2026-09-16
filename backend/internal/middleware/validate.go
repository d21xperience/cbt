package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

// ValidateStrings — helper untuk validasi field string wajib.
// Contoh pemakaian di handler:
//
//	if err := middleware.ValidateRequired(c, map[string]string{
//	    "username": req.Username,
//	    "password": req.Password,
//	}); err != nil { return err }
func ValidateRequired(c *fiber.Ctx, fields map[string]string) error {
	for name, val := range fields {
		if strings.TrimSpace(val) == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "field " + name + " wajib diisi",
			})
		}
	}
	return nil
}

// MaxLen — validasi panjang maksimum
func MaxLen(c *fiber.Ctx, name, val string, max int) error {
	if len(val) > max {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "field " + name + " terlalu panjang (max " + itoa(max) + ")",
		})
	}
	return nil
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}
