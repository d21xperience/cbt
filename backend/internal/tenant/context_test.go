package tenant

import (
	"context"
	"testing"
)

func TestFromContext_NoTenant(t *testing.T) {
	info := FromContext(context.Background())
	if info != nil {
		t.Errorf("expected nil, got %+v", info)
	}
}

func TestWithTenantInfo_RoundTrip(t *testing.T) {
	ctx := context.Background()
	expected := &TenantInfo{
		TenantID:  "test-tenant",
		Subdomain: "test",
		DBPath:    "/tmp/test.db",
	}
	ctx = WithTenantInfo(ctx, expected)

	got := FromContext(ctx)
	if got == nil {
		t.Fatal("expected non-nil")
	}
	if got.TenantID != expected.TenantID {
		t.Errorf("TenantID mismatch: %s != %s", got.TenantID, expected.TenantID)
	}
	if got.Subdomain != expected.Subdomain {
		t.Errorf("Subdomain mismatch")
	}
	if got.DBPath != expected.DBPath {
		t.Errorf("DBPath mismatch")
	}
}

func TestMustFromContext_Panics(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Errorf("expected panic, got none")
		}
	}()
	MustFromContext(context.Background())
}

func TestRedisKey_Basic(t *testing.T) {
	key := RedisKey("abc", "exam", "answers", "e1", "p1")
	want := "tenant:abc:exam:answers:e1:p1"
	if key != want {
		t.Errorf("got %q, want %q", key, want)
	}
}

func TestRedisKey_EmptyTenant_Panics(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Errorf("expected panic for empty tenantID")
		}
	}()
	RedisKey("", "x")
}

func TestRedisKey_EmptyPart_Panics(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Errorf("expected panic for empty part")
		}
	}()
	RedisKey("abc", "x", "", "y")
}
