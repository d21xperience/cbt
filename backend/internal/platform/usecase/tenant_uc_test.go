package usecase

import (
	"context"
	"testing"

	"cbt-engine-service/internal/platform/domain"
)

// mockProvisioner — testing stub
type mockProvisioner struct {
	shouldFail bool
	called     bool
	lastTenant string
}

func (m *mockProvisioner) Provision(ctx context.Context, tenantID, subdomain, adminUsername, adminPassword string) error {
	m.called = true
	m.lastTenant = tenantID
	if m.shouldFail {
		return errMockProvision
	}
	return nil
}

var errMockProvision = &mockError{"mock_provision_failed"}

type mockError struct{ msg string }

func (e *mockError) Error() string { return e.msg }

// ============================================
// Validation tests
// ============================================

func TestValidateRegistration_ValidInput(t *testing.T) {
	uc := &TenantUseCase{}

	req := domain.RegisterSchoolRequest{
		NPSN:          "20254180",
		SchoolName:    "SMK Negeri 1",
		Subdomain:     "smkn1",
		AdminUsername: "admin",
		AdminPassword: "password123",
	}

	if err := uc.validateRegistration(req); err != nil {
		t.Errorf("expected valid, got error: %v", err)
	}
}

func TestValidateRegistration_InvalidNPSN(t *testing.T) {
	uc := &TenantUseCase{}

	cases := []string{"123", "123456789", "abcdefgh", ""}
	for _, npsn := range cases {
		req := domain.RegisterSchoolRequest{
			NPSN:          npsn,
			SchoolName:    "Test",
			Subdomain:     "test",
			AdminUsername: "admin",
			AdminPassword: "password123",
		}
		if err := uc.validateRegistration(req); err == nil {
			t.Errorf("expected error for NPSN '%s'", npsn)
		}
	}
}

func TestValidateRegistration_InvalidSubdomain(t *testing.T) {
	uc := &TenantUseCase{}

	cases := []string{
		"ab", // too short
		// "ABC",     // uppercase
		"-abc",    // starts with hyphen
		"abc_def", // underscore
		"admin",   // reserved
		"api",     // reserved
		"thisisaverylongsubdomainexceeding30chars", // too long
	}

	for _, sub := range cases {
		req := domain.RegisterSchoolRequest{
			NPSN:          "20254180",
			SchoolName:    "Test",
			Subdomain:     sub,
			AdminUsername: "admin",
			AdminPassword: "password123",
		}
		if err := uc.validateRegistration(req); err == nil {
			t.Errorf("expected error for subdomain '%s'", sub)
		}
	}
}

func TestValidateRegistration_ShortPassword(t *testing.T) {
	uc := &TenantUseCase{}

	req := domain.RegisterSchoolRequest{
		NPSN:          "20254180",
		SchoolName:    "Test",
		Subdomain:     "testschool",
		AdminUsername: "admin",
		AdminPassword: "short", // < 8
	}
	if err := uc.validateRegistration(req); err == nil {
		t.Error("expected error for short password")
	}
}

func TestApproveSchool_ReturnsTempPassword(t *testing.T) {
	// NOTE: Integration test — butuh DB atau mock repo.
	// Skeleton untuk memastikan signature benar.
	//
	// Saat ini di-skip karena butuh full infra.
	t.Skip("Integration test — akan dibuat di test suite")
}

func TestGenerateTempPassword(t *testing.T) {
	for length := 8; length <= 16; length++ {
		pw, err := generateTempPassword(length)
		if err != nil {
			t.Fatalf("length=%d: %v", length, err)
		}
		if len(pw) != length {
			t.Errorf("length=%d: got %d chars", length, len(pw))
		}
	}
}

// TestValidateRegistration_NormalizesCase — uppercase diterima, di-lowercase
// Bukti: design normalizes di 3 tempat (validate, register, resolve).
func TestValidateRegistration_NormalizesCase(t *testing.T) {
	uc := &TenantUseCase{}

	req := domain.RegisterSchoolRequest{
		NPSN:          "20254180",
		SchoolName:    "Test",
		Subdomain:     "SMKJaya",
		AdminUsername: "admin",
		AdminPassword: "password123",
	}
	if err := uc.validateRegistration(req); err != nil {
		t.Errorf("expected uppercase subdomain to be accepted (normalized), got: %v", err)
	}
}
