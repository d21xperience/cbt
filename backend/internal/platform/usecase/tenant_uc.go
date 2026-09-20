package usecase

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"cbt-engine-service/internal/platform/domain"
	"cbt-engine-service/internal/platform/repository"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

var (
	ErrTenantNotFound     = errors.New("tenant_not_found")
	ErrTenantSuspended    = errors.New("tenant_suspended")
	ErrTenantInactive     = errors.New("tenant_inactive")
	ErrSubdomainInvalid   = errors.New("subdomain_invalid")
	ErrNPSNExists         = errors.New("npsn_already_exists")
	ErrSubdomainExists    = errors.New("subdomain_already_exists")
	ErrInvalidFormat      = errors.New("invalid_format")
	ErrTenantNotPending   = errors.New("tenant_not_pending")
	ErrProvisioningFailed = errors.New("provisioning_failed")
)

// Subdomain regex: 3-30 chars, lowercase alphanumeric + hyphen, must start alphanumeric
var subdomainRegex = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{2,29}$`)

// NPSN: exactly 8 digits
var npsnRegex = regexp.MustCompile(`^\d{8}$`)

// Reserved words — cannot be used as subdomain
var reservedSubdomains = map[string]bool{
	"www": true, "api": true, "admin": true, "super": true,
	"auth": true, "exam": true, "proctor": true, "platform": true,
	"cbt": true, "public": true, "app": true, "mail": true,
	"ftp": true, "ns": true, "ns1": true, "ns2": true,
}

// Provisioner interface — break import cycle
type Provisioner interface {
	Provision(ctx context.Context, tenantID, subdomain, adminUsername, adminPassword string) error
}

type TenantUseCase struct {
	tenantRepo  *repository.TenantDB
	subRepo     *repository.SubscriptionDB
	provisioner Provisioner
	rdb         *redis.Client
	basePath    string
}

// NewTenantUseCase — legacy constructor (dipakai existing main.go).
// Akan di-upgrade dengan NewTenantUseCaseFull di app/infra.go.
func NewTenantUseCase(repo *repository.TenantDB, basePath string) *TenantUseCase {
	return &TenantUseCase{
		tenantRepo: repo,
		basePath:   basePath,
	}
}

// NewTenantUseCaseFull — full constructor dengan provisioner + subscription + redis.
func NewTenantUseCaseFull(
	repo *repository.TenantDB,
	subRepo *repository.SubscriptionDB,
	provisioner Provisioner,
	rdb *redis.Client,
	basePath string,
) *TenantUseCase {
	return &TenantUseCase{
		tenantRepo:  repo,
		subRepo:     subRepo,
		provisioner: provisioner,
		rdb:         rdb,
		basePath:    basePath,
	}
}

// ============================================
// Resolution (existing)
// ============================================

func (uc *TenantUseCase) ResolveBySubdomain(ctx context.Context, subdomain string) (*domain.TenantResolution, error) {
	subdomain = strings.TrimSpace(strings.ToLower(subdomain))
	if subdomain == "" {
		return nil, ErrSubdomainInvalid
	}

	t, err := uc.tenantRepo.GetBySubdomain(ctx, subdomain)
	if err != nil {
		return nil, err
	}
	if t == nil {
		return nil, ErrTenantNotFound
	}
	if !t.IsActive || t.Status != domain.TenantStatusActive {
		return nil, ErrTenantInactive
	}
	if t.IsSuspended {
		return nil, ErrTenantSuspended
	}

	return &domain.TenantResolution{
		TenantID:    t.TenantID,
		Subdomain:   t.Subdomain,
		DBPath:      filepath.Join(uc.basePath, t.DBPath),
		IsActive:    t.IsActive,
		IsSuspended: t.IsSuspended,
	}, nil
}

func (uc *TenantUseCase) ResolveByID(ctx context.Context, tenantID string) (*domain.TenantResolution, error) {
	if tenantID == "" {
		return nil, ErrTenantNotFound
	}
	t, err := uc.tenantRepo.GetByID(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	if t == nil {
		return nil, ErrTenantNotFound
	}
	if !t.IsActive || t.Status != domain.TenantStatusActive {
		return nil, ErrTenantInactive
	}
	if t.IsSuspended {
		return nil, ErrTenantSuspended
	}
	return &domain.TenantResolution{
		TenantID:    t.TenantID,
		Subdomain:   t.Subdomain,
		DBPath:      filepath.Join(uc.basePath, t.DBPath),
		IsActive:    t.IsActive,
		IsSuspended: t.IsSuspended,
	}, nil
}

// ListAll — untuk super admin (semua tenant aktif)
func (uc *TenantUseCase) ListAll(ctx context.Context) ([]domain.Tenant, error) {
	return uc.tenantRepo.ListActive(ctx)
}

// GetTenant — raw tenant
func (uc *TenantUseCase) GetTenant(ctx context.Context, tenantID string) (*domain.Tenant, error) {
	return uc.tenantRepo.GetByID(ctx, tenantID)
}

// GetTenantBySubdomain — full tenant
func (uc *TenantUseCase) GetTenantBySubdomain(ctx context.Context, subdomain string) (*domain.Tenant, error) {
	return uc.tenantRepo.GetBySubdomain(ctx, strings.ToLower(strings.TrimSpace(subdomain)))
}

// ============================================
// BE-P1: Public registration + Super Admin approval
// ============================================

// RegisterSchool — public registration, save as PENDING.
// No provisioning yet — just save metadata.
func (uc *TenantUseCase) RegisterSchool(ctx context.Context, req domain.RegisterSchoolRequest) (*domain.Tenant, error) {
	// 1. Validate format
	if err := uc.validateRegistration(req); err != nil {
		return nil, err
	}

	// 2. Normalize
	req.NPSN = strings.TrimSpace(req.NPSN)
	req.Subdomain = strings.ToLower(strings.TrimSpace(req.Subdomain))
	req.SchoolName = strings.TrimSpace(req.SchoolName)
	req.ContactEmail = strings.TrimSpace(req.ContactEmail)
	req.ContactPhone = strings.TrimSpace(req.ContactPhone)
	req.AdminUsername = strings.TrimSpace(req.AdminUsername)

	// 3. Check duplicates
	exists, err := uc.tenantRepo.ExistsNPSN(ctx, req.NPSN)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrNPSNExists
	}

	exists, err = uc.tenantRepo.ExistsSubdomain(ctx, req.Subdomain)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrSubdomainExists
	}
	// VER-007 — set default jenjang kalau kosong
	jenjang := req.Jenjang
	if jenjang == "" {
		jenjang = "SMA"
	}
	duration := req.ProgramDurationYears
	if duration <= 0 {
		duration = 3
	}
	// 4. Build tenant record (status = PENDING)
	tenantID := uuid.NewString()
	relDBPath := filepath.Join("tenants", tenantID, "cbt.db")

	t := &domain.Tenant{
		TenantID:             tenantID,
		NPSN:                 req.NPSN,
		Subdomain:            req.Subdomain,
		SchoolName:           req.SchoolName,
		ContactEmail:         req.ContactEmail,
		ContactPhone:         req.ContactPhone,
		IsActive:             false,
		IsSuspended:          false,
		DBPath:               relDBPath,
		Status:               domain.TenantStatusPending,
		PendingAdminUsername: req.AdminUsername,
		Jenjang:              jenjang, // ← NEW
		ProgramDurationYears: duration,
	}

	if err := uc.tenantRepo.Create(ctx, t); err != nil {
		return nil, err
	}

	log.Printf("[ONBOARDING] Registered pending school: %s (npsn=%s)", req.SchoolName, req.NPSN)
	return t, nil
}

// ListPendingSchools — super admin queue.
func (uc *TenantUseCase) ListPendingSchools(ctx context.Context) ([]domain.Tenant, error) {
	return uc.tenantRepo.ListPending(ctx)
}

// ApproveSchool — super admin approves → provision tenant DB + activate.
//
// Returns: (tempPassword, error)
//   - tempPassword: password sementara untuk admin sekolah (12 char random).
//     Super Admin WAJIB menyalin dan memberikan ke sekolah.
//   - Admin sekolah WAJIB ganti password setelah login pertama.
//
// Idempotent: provisioning ulang aman karena migration pakai IF NOT EXISTS.
func (uc *TenantUseCase) ApproveSchool(
	ctx context.Context,
	tenantID, actorID string,
) (string, error) {
	if uc.provisioner == nil {
		return "", errors.New("provisioner_not_configured")
	}

	// 1. Get tenant
	t, err := uc.tenantRepo.GetByID(ctx, tenantID)
	if err != nil {
		return "", err
	}
	if t == nil {
		return "", ErrTenantNotFound
	}
	if t.Status != domain.TenantStatusPending {
		return "", ErrTenantNotPending
	}

	// 2. Tentukan admin username: dari registration (fallback 'admin')
	adminUsername := t.PendingAdminUsername
	if adminUsername == "" {
		adminUsername = "admin"
	}

	// 3. Generate temp password (12 char random)
	tempPassword, err := generateTempPassword(12)
	if err != nil {
		return "", fmt.Errorf("%w: generate password: %v", ErrProvisioningFailed, err)
	}

	// 4. Provision tenant DB
	if err := uc.provisioner.Provision(ctx, t.TenantID, t.Subdomain, adminUsername, tempPassword); err != nil {
		log.Printf("[ONBOARDING] Provisioning failed for %s: %v", tenantID, err)
		return "", fmt.Errorf("%w: %v", ErrProvisioningFailed, err)
	}

	// 5. Update status → ACTIVE
	if err := uc.tenantRepo.UpdateStatus(ctx, tenantID, domain.TenantStatusActive, actorID, ""); err != nil {
		log.Printf("[ONBOARDING] Status update failed for %s: %v", tenantID, err)
		return "", fmt.Errorf("%w: status update: %v", ErrProvisioningFailed, err)
	}

	// 6. Create TRIAL subscription (30 days)
	if uc.subRepo != nil {
		sub := &domain.Subscription{
			TenantID:   tenantID,
			Plan:       "TRIAL",
			ValidFrom:  time.Now(),
			ValidUntil: time.Now().AddDate(0, 0, 30),
			IsActive:   true,
			PriceIDR:   0,
			Notes:      fmt.Sprintf("Auto-created on approval by %s", actorID),
		}
		if err := uc.subRepo.Create(ctx, sub); err != nil {
			log.Printf("[ONBOARDING] Warning: subscription create failed: %v", err)
		}
	}

	// 7. Invalidate public cache
	uc.invalidatePublicCache(ctx)

	log.Printf("[ONBOARDING] Tenant %s (%s) APPROVED by %s — admin=%s",
		t.Subdomain, tenantID, actorID, adminUsername)

	return tempPassword, nil
}

// RejectSchool — super admin rejects pending tenant.
func (uc *TenantUseCase) RejectSchool(ctx context.Context, tenantID, actorID, reason string) error {
	t, err := uc.tenantRepo.GetByID(ctx, tenantID)
	if err != nil {
		return err
	}
	if t == nil {
		return ErrTenantNotFound
	}
	if t.Status != domain.TenantStatusPending {
		return ErrTenantNotPending
	}

	if err := uc.tenantRepo.UpdateStatus(ctx, tenantID, domain.TenantStatusRejected, actorID, reason); err != nil {
		return err
	}
	log.Printf("[ONBOARDING] Tenant %s REJECTED by %s (reason=%s)", tenantID, actorID, reason)
	return nil
}

// ============================================
// BE-P2: Public school list (landing page)
// ============================================

const publicSchoolsCacheKey = "public:schools:list"

// ListActivePublic — return list dari DB atau cache.
func (uc *TenantUseCase) ListActivePublic(ctx context.Context) ([]domain.PublicSchoolDTO, error) {
	// Try Redis cache first
	if uc.rdb != nil {
		if cached, err := uc.rdb.Get(ctx, publicSchoolsCacheKey).Result(); err == nil && cached != "" {
			// Not deserializing JSON here — let handler do it
			// Actually simpler: this function returns fresh data,
			// cache is stored at handler level. Skip cache here.
			_ = cached
		}
	}

	// For simplicity: query DB directly.
	// Cache di-invalidate on approve.
	return uc.tenantRepo.ListActivePublic(ctx)
}

// invalidatePublicCache — dipanggil saat approve.
func (uc *TenantUseCase) invalidatePublicCache(ctx context.Context) {
	if uc.rdb == nil {
		return
	}
	if err := uc.rdb.Del(ctx, publicSchoolsCacheKey).Err(); err != nil {
		log.Printf("[ONBOARDING] Cache invalidation failed: %v", err)
	}
}

// ============================================
// Validation
// ============================================

func (uc *TenantUseCase) validateRegistration(req domain.RegisterSchoolRequest) error {
	if !npsnRegex.MatchString(strings.TrimSpace(req.NPSN)) {
		return fmt.Errorf("%w: NPSN harus 8 digit angka", ErrInvalidFormat)
	}
	if req.Jenjang != "" {
		validJenjang := map[string]bool{
			"SD": true, "MI": true,
			"SMP": true, "MTs": true,
			"SMA": true, "MA": true,
			"SMK": true, "MAK": true,
		}
		if !validJenjang[req.Jenjang] {
			return fmt.Errorf("%w: jenjang '%s' tidak valid", ErrInvalidFormat, req.Jenjang)
		}
		return nil
	}

	// VER-007 — validate duration (optional)
	if req.ProgramDurationYears < 0 || req.ProgramDurationYears > 6 {
		return fmt.Errorf("%w: program_duration_years harus 1-6", ErrInvalidFormat)
	}

	subdomain := strings.ToLower(strings.TrimSpace(req.Subdomain))
	if !subdomainRegex.MatchString(subdomain) {
		return fmt.Errorf("%w: subdomain harus 3-30 karakter (a-z, 0-9, -), start dengan huruf/angka", ErrInvalidFormat)
	}
	if reservedSubdomains[subdomain] {
		return fmt.Errorf("%w: subdomain '%s' adalah reserved word", ErrInvalidFormat, subdomain)
	}

	if strings.TrimSpace(req.SchoolName) == "" {
		return fmt.Errorf("%w: school_name wajib", ErrInvalidFormat)
	}
	if strings.TrimSpace(req.AdminUsername) == "" {
		return fmt.Errorf("%w: admin_username wajib", ErrInvalidFormat)
	}
	if len(req.AdminPassword) < 8 {
		return fmt.Errorf("%w: admin_password minimal 8 karakter", ErrInvalidFormat)
	}

	return nil
}

// ============================================
// Helpers
// ============================================

func generateTempPassword(length int) (string, error) {
	if length < 8 {
		length = 12
	}
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
	out := make([]byte, length)
	for i := range out {
		n, err := randomInt(len(alphabet))
		if err != nil {
			return "", err
		}
		out[i] = alphabet[n]
	}
	return string(out), nil
}

func randomInt(max int) (int, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(int64(max)))
	if err != nil {
		return 0, err
	}
	return int(n.Int64()), nil
}
