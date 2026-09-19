package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

// ============================================
// Helper: isIPAddress
// ============================================

func TestIsIPAddress(t *testing.T) {
	cases := []struct {
		host string
		want bool
	}{
		{"192.168.1.10", true},
		{"10.0.0.1", true},
		{"127.0.0.1", true},
		{"255.255.255.255", true},
		{"0.0.0.0", true},
		{"256.1.1.1", false},
		{"192.168.1", false},
		{"192.168.1.1.1", false},
		{"example.com", false},
		{"smkjaya.ujian.pw", false},
		{"1.2.3.abc", false},
	}
	for _, tc := range cases {
		if got := isIPAddress(tc.host); got != tc.want {
			t.Errorf("isIPAddress(%q) = %v, want %v", tc.host, got, tc.want)
		}
	}
}

// ============================================
// Helper: isReservedPrefix
// ============================================

func TestIsReservedPrefix(t *testing.T) {
	cases := []struct {
		prefix string
		want   bool
	}{
		{"www", true}, {"api", true}, {"admin", true}, {"super", true},
		{"auth", true}, {"exam", true}, {"proctor", true}, {"platform", true},
		{"cbt", true}, {"app", true}, {"mail", true},
		{"smkjaya", false}, {"default", false}, {"dev", false},
	}
	for _, tc := range cases {
		if got := isReservedPrefix(tc.prefix); got != tc.want {
			t.Errorf("isReservedPrefix(%q) = %v, want %v", tc.prefix, got, tc.want)
		}
	}
}

// ============================================
// Integration: extractSubdomain
// ============================================

func TestExtractSubdomain_Integration(t *testing.T) {
	cases := []struct {
		name       string
		host       string
		header     string
		query      string
		defaultSub string
		want       string
	}{
		// Production single-level
		{"prod single", "smkjaya.ujian.pw", "", "", "default", "smkjaya"},
		{"prod default", "default.ujian.pw", "", "", "default", "default"},

		// Production multi-level
		{"prod multi admin", "admin.smkjaya.ujian.pw", "", "", "default", "smkjaya"},
		{"prod multi www", "www.smkjaya.ujian.pw", "", "", "default", "smkjaya"},
		{"prod multi api", "api.smkjaya.ujian.pw", "", "", "default", "smkjaya"},

		// Root domain → fallback
		{"root domain", "ujian.pw", "", "", "default", "default"},
		{"root domain dev", "ujian.pw", "", "", "dev", "dev"},

		// IP → fallback
		{"ip", "192.168.1.10", "", "", "dev", "dev"},
		{"ip public", "10.0.0.1", "", "", "default", "default"},

		// Header override
		{"localhost header", "localhost", "smkjaya", "", "default", "smkjaya"},
		{"root header", "ujian.pw", "custom", "", "default", "custom"},

		// Query param
		{"localhost query", "localhost", "", "dev", "default", "dev"},

		// Priority: Host > header > query
		{"host beats header", "smkjaya.ujian.pw", "other", "", "default", "smkjaya"},
		{"header beats query", "localhost", "from-header", "from-query", "default", "from-header"},

		// Localhost fallback
		{"localhost", "localhost", "", "", "dev", "dev"},
		{"127", "127.0.0.1", "", "", "dev", "dev"},

		// Empty default → "default"
		{"empty default", "ujian.pw", "", "", "", "default"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			app := fiber.New()
			app.Get("/test", func(c *fiber.Ctx) error {
				got := extractSubdomain(c, tc.defaultSub)
				if got != tc.want {
					t.Errorf("host=%q header=%q query=%q default=%q: got %q, want %q",
						tc.host, tc.header, tc.query, tc.defaultSub, got, tc.want)
				}
				return c.SendStatus(200)
			})

			url := "/test"
			if tc.query != "" {
				url += "?tenant=" + tc.query
			}

			req := httptest.NewRequest("GET", url, nil)
			req.Host = tc.host
			if tc.header != "" {
				req.Header.Set("X-Tenant-Slug", tc.header)
			}

			_, _ = app.Test(req)
		})
	}
}
