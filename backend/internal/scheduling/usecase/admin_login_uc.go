package usecase

import (
	"context"
	"errors"
	"time"

	"cbt-engine-service/internal/scheduling/repository"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid_credentials")
	ErrAccountInactive    = errors.New("account_inactive")
	ErrNotSuperAdmin      = errors.New("not_super_admin")
)

const (
	AdminTokenDuration = 12 * time.Hour
	SuperTokenDuration = 8 * time.Hour
)

type AdminLoginUseCase struct {
	adminDB         *repository.AdminDB // tenant DB (legacy)
	platformAdminDB *repository.AdminDB // FASE 3: platform DB (cross-tenant)
}

func NewAdminLoginUseCase(adminDB *repository.AdminDB) *AdminLoginUseCase {
	return &AdminLoginUseCase{adminDB: adminDB}
}

// NewAdminLoginUseCaseFull — FASE 3: dengan platform DB fallback.
func NewAdminLoginUseCaseFull(adminDB, platformAdminDB *repository.AdminDB) *AdminLoginUseCase {
	return &AdminLoginUseCase{adminDB: adminDB, platformAdminDB: platformAdminDB}
}

type AdminLoginResult struct {
	AdminID  string
	Username string
	Role     string
	TenantID string
}

func (uc *AdminLoginUseCase) Login(ctx context.Context, tenantID, username, password string) (*AdminLoginResult, error) {
	// 1. Coba tenant DB dulu (kompatibilitas dev tenant)
	admin, err := uc.adminDB.FindByUsername(ctx, tenantID, username)
	if err != nil {
		return nil, err
	}

	// 2. Fallback ke platform DB jika tidak ditemukan & platformAdminDB tersedia
	if admin == nil && uc.platformAdminDB != nil {
		admin, err = uc.platformAdminDB.FindByUsername(ctx, tenantID, username)
		if err != nil {
			return nil, err
		}
	}

	if admin == nil {
		// timing-attack mitigation
		_ = bcrypt.CompareHashAndPassword([]byte("$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"), []byte(password))
		return nil, ErrInvalidCredentials
	}
	if !admin.IsActive {
		return nil, ErrAccountInactive
	}
	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}
	return &AdminLoginResult{
		AdminID:  admin.ID,
		Username: admin.Username,
		Role:     admin.Role,
		TenantID: admin.TenantID,
	}, nil
}

func (uc *AdminLoginUseCase) LoginSuperAdmin(ctx context.Context, username, password string) (*AdminLoginResult, error) {
	res, err := uc.Login(ctx, "platform", username, password)
	if err != nil {
		return nil, err
	}
	if res.Role != "SUPER_ADMIN" {
		return nil, ErrNotSuperAdmin
	}
	return res, nil
}

func HashPassword(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	return string(b), err
}
