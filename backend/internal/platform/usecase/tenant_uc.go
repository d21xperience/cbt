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

var subdomainRegex = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{2,29}$`)
var npsnRegex = regexp.MustCompile(`^\d{8}$`)

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

// NewTenantUseCase — legacy constructor.
func NewTenantUseCase(repo *repository.TenantDB, basePath string) *TenantUseCase {
	return &TenantUseCase{
		tenantRepo: repo,
		basePath:   basePath,
	}
}

// NewTenantUseCaseFull — full constructor.
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
		SchoolName:  t.SchoolName,
		NPSN:        t.NPSN,
		Jenjang:     t.Jenjang,
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
func (uc *TenantUseCase) RegisterSchool(ctx context.Context, req domain.RegisterSchoolRequest) (*domain.Tenant, error) {
	if err := uc.validateRegistration(req); err != nil {
		return nil, err
	}

	req.NPSN = strings.TrimSpace(req.NPSN)
	req.Subdomain = strings.ToLower(strings.TrimSpace(req.Subdomain))
	req.SchoolName = strings.TrimSpace(req.SchoolName)
	req.ContactEmail = strings.TrimSpace(req.ContactEmail)
	req.ContactPhone = strings.TrimSpace(req.ContactPhone)
	req.AdminUsername = strings.TrimSpace(req.AdminUsername)

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

	jenjang := req.Jenjang
	if jenjang == "" {
		jenjang = "SMA"
	}
	duration := req.ProgramDurationYears
	if duration <= 0 {
		duration = 3
	}

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
		Jenjang:              jenjang,
		ProgramDurationYears: duration,
		PackageTier:          "BASIC",
		BillingType:          "MONTHLY",
		MaxParticipants:      500,
	}

	if err := uc.tenantRepo.Create(ctx, t); err != nil {
		return nil, err
	}

	log.Printf("[ONBOARDING] Registered pending school: %s (npsn=%s)", req.SchoolName, req.NPSN)
	return t, nil
}

// ============================================
// NEW (FASE 2): SuperRegisterSchool
// ============================================

// SuperRegisterSchool — superadmin direct-create: register + approve (provisioning
// langsung) + apply operational fields dari form. Return (tenant, tempPassword, error).
func (uc *TenantUseCase) SuperRegisterSchool(
	ctx context.Context,
	req domain.SuperRegisterSchoolRequest,
	actorID string,
) (*domain.Tenant, string, error) {
	// 1. Register dulu sebagai PENDING
	t, err := uc.RegisterSchool(ctx, req.RegisterSchoolRequest)
	if err != nil {
		return nil, "", err
	}

	// 2. Approve langsung (provisioning)
	tempPassword, err := uc.ApproveSchool(ctx, t.TenantID, actorID)
	if err != nil {
		return nil, "", err
	}

	// 3. Apply operational fields (jika ada)
	updateReq := &domain.UpdateSchoolRequest{}
	if req.PackageTier != "" {
		updateReq.PackageTier = &req.PackageTier
	}
	if req.BillingType != "" {
		updateReq.BillingType = &req.BillingType
	}
	if req.MaxParticipants > 0 {
		updateReq.MaxParticipants = &req.MaxParticipants
	}
	if err := uc.tenantRepo.UpdateSchool(ctx, t.TenantID, updateReq); err != nil {
		log.Printf("[ONBOARDING] Warning: operational update failed for %s: %v", t.TenantID, err)
	}

	// 4. Reload tenant
	updated, err := uc.tenantRepo.GetByID(ctx, t.TenantID)
	if err != nil || updated == nil {
		updated = t
	}

	log.Printf("[ONBOARDING] SuperAdmin direct-registered tenant %s (%s) by %s",
		updated.Subdomain, updated.TenantID, actorID)

	return updated, tempPassword, nil
}

// ============================================
// NEW (FASE 2): UpdateSchool / Suspend / Unsuspend / SyncLock
// ============================================

// UpdateSchool — partial update operational fields.
func (uc *TenantUseCase) UpdateSchool(ctx context.Context, tenantID string, req *domain.UpdateSchoolRequest, actorID string) error {
	t, err := uc.tenantRepo.GetByID(ctx, tenantID)
	if err != nil {
		return err
	}
	if t == nil {
		return ErrTenantNotFound
	}

	// Validasi format jika ada
	if req.NPSN != nil {
		if !npsnRegex.MatchString(*req.NPSN) {
			return fmt.Errorf("%w: NPSN harus 8 digit angka", ErrInvalidFormat)
		}
		exists, err := uc.tenantRepo.ExistsNPSN(ctx, *req.NPSN)
		if err != nil {
			return err
		}
		if exists && *req.NPSN != t.NPSN {
			return ErrNPSNExists
		}
	}
	if req.Subdomain != nil {
		sub := strings.ToLower(strings.TrimSpace(*req.Subdomain))
		if !subdomainRegex.MatchString(sub) {
			return fmt.Errorf("%w: subdomain invalid", ErrInvalidFormat)
		}
		if reservedSubdomains[sub] {
			return fmt.Errorf("%w: subdomain reserved", ErrInvalidFormat)
		}
		exists, err := uc.tenantRepo.ExistsSubdomain(ctx, sub)
		if err != nil {
			return err
		}
		if exists && sub != t.Subdomain {
			return ErrSubdomainExists
		}
		req.Subdomain = &sub
	}

	if err := uc.tenantRepo.UpdateSchool(ctx, tenantID, req); err != nil {
		return err
	}

	log.Printf("[ONBOARDING] Tenant %s updated by %s", tenantID, actorID)
	uc.invalidatePublicCache(ctx)
	return nil
}

// SuspendSchool — set is_suspended + reason.
func (uc *TenantUseCase) SuspendSchool(ctx context.Context, tenantID, reason, actorID string) error {
	if strings.TrimSpace(reason) == "" {
		return fmt.Errorf("%w: reason wajib", ErrInvalidFormat)
	}
	t, err := uc.tenantRepo.GetByID(ctx, tenantID)
	if err != nil {
		return err
	}
	if t == nil {
		return ErrTenantNotFound
	}
	if t.IsSuspended {
		return nil // idempotent
	}
	if err := uc.tenantRepo.UpdateSuspend(ctx, tenantID, true, reason); err != nil {
		return err
	}
	log.Printf("[ONBOARDING] Tenant %s SUSPENDED by %s (reason=%s)", tenantID, actorID, reason)
	uc.invalidatePublicCache(ctx)
	return nil
}

// UnsuspendSchool — reset is_suspended + clear reason.
func (uc *TenantUseCase) UnsuspendSchool(ctx context.Context, tenantID, note, actorID string) error {
	t, err := uc.tenantRepo.GetByID(ctx, tenantID)
	if err != nil {
		return err
	}
	if t == nil {
		return ErrTenantNotFound
	}
	if !t.IsSuspended {
		return nil // idempotent
	}
	if err := uc.tenantRepo.UpdateSuspend(ctx, tenantID, false, ""); err != nil {
		return err
	}
	log.Printf("[ONBOARDING] Tenant %s UNSUSPENDED by %s (note=%s)", tenantID, actorID, note)
	uc.invalidatePublicCache(ctx)
	return nil
}

// SetSyncLock — toggle sync_locked flag.
func (uc *TenantUseCase) SetSyncLock(ctx context.Context, tenantID string, locked bool, actorID string) error {
	t, err := uc.tenantRepo.GetByID(ctx, tenantID)
	if err != nil {
		return err
	}
	if t == nil {
		return ErrTenantNotFound
	}
	if err := uc.tenantRepo.UpdateSyncLock(ctx, tenantID, locked); err != nil {
		return err
	}
	log.Printf("[ONBOARDING] Tenant %s sync-locked=%v by %s", tenantID, locked, actorID)
	return nil
}

// ============================================
// ListPendingSchools / ApproveSchool / RejectSchool (existing)
// ============================================

func (uc *TenantUseCase) ListPendingSchools(ctx context.Context) ([]domain.Tenant, error) {
	return uc.tenantRepo.ListPending(ctx)
}

func (uc *TenantUseCase) ApproveSchool(
	ctx context.Context,
	tenantID, actorID string,
) (string, error) {
	if uc.provisioner == nil {
		return "", errors.New("provisioner_not_configured")
	}

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

	adminUsername := t.PendingAdminUsername
	if adminUsername == "" {
		adminUsername = "admin"
	}

	tempPassword, err := generateTempPassword(12)
	if err != nil {
		return "", fmt.Errorf("%w: generate password: %v", ErrProvisioningFailed, err)
	}

	if err := uc.provisioner.Provision(ctx, t.TenantID, t.Subdomain, adminUsername, tempPassword); err != nil {
		log.Printf("[ONBOARDING] Provisioning failed for %s: %v", tenantID, err)
		return "", fmt.Errorf("%w: %v", ErrProvisioningFailed, err)
	}

	if err := uc.tenantRepo.UpdateStatus(ctx, tenantID, domain.TenantStatusActive, actorID, ""); err != nil {
		log.Printf("[ONBOARDING] Status update failed for %s: %v", tenantID, err)
		return "", fmt.Errorf("%w: status update: %v", ErrProvisioningFailed, err)
	}

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

	uc.invalidatePublicCache(ctx)

	log.Printf("[ONBOARDING] Tenant %s (%s) APPROVED by %s — admin=%s",
		t.Subdomain, tenantID, actorID, adminUsername)

	return tempPassword, nil
}

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
// BE-P2: Public school list
// ============================================

const publicSchoolsCacheKey = "public:schools:list"

func (uc *TenantUseCase) ListActivePublic(ctx context.Context) ([]domain.PublicSchoolDTO, error) {
	return uc.tenantRepo.ListActivePublic(ctx)
}

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
	}

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
