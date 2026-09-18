package tenant

import "fmt"

// RedisKey — build tenant-namespaced Redis key.
//
// Contoh:
//
//	RedisKey("abc-123", "exam", "answers", "exam-1", "part-1")
//	→ "tenant:abc-123:exam:answers:exam-1:part-1"
//
// WAJIB: tenantID tidak boleh kosong. Panic kalau kosong — mencegah
// key tanpa namespace yang dapat collision antar tenant.
func RedisKey(tenantID string, parts ...string) string {
	if tenantID == "" {
		panic("tenant.RedisKey: empty tenantID — refusing to build unnamed key")
	}
	key := "tenant:" + tenantID
	for _, p := range parts {
		if p == "" {
			panic("tenant.RedisKey: empty key part")
		}
		key += ":" + p
	}
	return key
}

// RedisPrefix — prefix untuk SCAN pattern.
// Contoh: RedisPrefix("abc-123") → "tenant:abc-123:"
func RedisPrefix(tenantID string) string {
	if tenantID == "" {
		panic("tenant.RedisPrefix: empty tenantID")
	}
	return "tenant:" + tenantID + ":"
}

// RedisKeyFmt — varian dengan format string (untuk kompat pattern existing).
// WAJIB prefix: "tenant:" + tenantID: selalu prepend.
func RedisKeyFmt(tenantID, format string, args ...any) string {
	if tenantID == "" {
		panic("tenant.RedisKeyFmt: empty tenantID")
	}
	body := fmt.Sprintf(format, args...)
	return "tenant:" + tenantID + ":" + body
}
