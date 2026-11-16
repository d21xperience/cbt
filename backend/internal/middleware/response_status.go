package middleware

import (
	"encoding/json"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// EnsureResponseStatus — auto-inject `"status":"ok"` / `"status":"error"`
// ke body JSON yang belum punya field `status`. Zero handler changes.
//
// Rules:
//   - Skip non-JSON responses
//   - Skip body yang bukan JSON object (top-level `{`)
//   - Skip paths dengan prefix di skipPrefixes (runtime exam = hot path)
//   - Body yang sudah punya `status` → respect handler (tidak diubah)
//   - HTTP status >= 400 → "error", < 400 → "ok"
func EnsureResponseStatus(skipPrefixes ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if err := c.Next(); err != nil {
			return err
		}

		path := c.Path()
		for _, p := range skipPrefixes {
			if p != "" && strings.HasPrefix(path, p) {
				return nil
			}
		}

		ct := string(c.Response().Header.ContentType())
		if !strings.HasPrefix(ct, "application/json") {
			return nil
		}

		body := c.Response().Body()
		if len(body) == 0 || body[0] != '{' {
			return nil
		}

		var m map[string]json.RawMessage
		if jerr := json.Unmarshal(body, &m); jerr != nil {
			return nil
		}
		if _, has := m["status"]; has {
			return nil
		}

		statusVal := "ok"
		if c.Response().StatusCode() >= 400 {
			statusVal = "error"
		}
		m["status"], _ = json.Marshal(statusVal)

		newBody, merr := json.Marshal(m)
		if merr != nil {
			return nil
		}
		c.Response().SetBody(newBody)
		return nil
	}
}
