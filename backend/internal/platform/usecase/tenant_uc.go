package usecase

import (
	"context"
	"errors"
	"path/filepath"
	"strings"

	"cbt-engine-service/internal/platform/domain"
	"cbt-engine-service/internal/platform/repository"
)

var (
	ErrTenantNotFound   = errors.New("tenant_not_found")
	ErrTenantSuspended  = errors.New("tenant_suspended")
	ErrTenantInactive   = errors.New("tenant_inactive")
	ErrSubdomainInvalid = errors.New("subdomain_invalid")
)

type TenantUseCase struct {
	tenantRepo *repository.TenantDB
	basePath   string
}

func NewTenantUseCase(repo *repository.TenantDB, basePath string) *TenantUseCase {
	return &TenantUseCase{
		tenantRepo: repo,
		basePath:   basePath,
	}
}

// ResolveBySubdomain — dari subdomain ke tenant resolution
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
	if !t.IsActive {
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

// ResolveByID — resolve langsung dari tenant_id (untuk API-based)
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
	if !t.IsActive {
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

// ListAll — untuk super admin
func (uc *TenantUseCase) ListAll(ctx context.Context) ([]domain.Tenant, error) {
	return uc.tenantRepo.ListActive(ctx)
}

// GetTenant — raw tenant (untuk detail admin)
func (uc *TenantUseCase) GetTenant(ctx context.Context, tenantID string) (*domain.Tenant, error) {
	return uc.tenantRepo.GetByID(ctx, tenantID)
}
