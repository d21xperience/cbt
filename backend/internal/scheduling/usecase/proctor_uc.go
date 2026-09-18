package usecase

import (
	"context"
	"errors"

	"cbt-engine-service/internal/scheduling/domain"
	"cbt-engine-service/internal/scheduling/repository"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrProctorNotFound   = errors.New("proctor_not_found")
	ErrInvalidProctorPwd = errors.New("invalid_proctor_password")
)

type ProctorUseCase struct {
	proctorDB *repository.ProctorDB
}

func NewProctorUseCase(db *repository.ProctorDB) *ProctorUseCase {
	return &ProctorUseCase{proctorDB: db}
}

type ProctorLoginResult struct {
	ProctorID string
	Username  string
	Role      string
	TenantID  string
}

func (uc *ProctorUseCase) Login(ctx context.Context, tenantID, username, password string) (*ProctorLoginResult, error) {
	id, hash, role, err := uc.proctorDB.FindProctorByUsername(ctx, tenantID, username)
	if err != nil {
		return nil, err
	}
	if id == "" {
		return nil, ErrProctorNotFound
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)); err != nil {
		return nil, ErrInvalidProctorPwd
	}
	return &ProctorLoginResult{
		ProctorID: id,
		Username:  username,
		Role:      role,
		TenantID:  tenantID,
	}, nil
}

func (uc *ProctorUseCase) Assign(ctx context.Context, a *domain.ProctorAssignment) error {
	return uc.proctorDB.Assign(ctx, a)
}

func (uc *ProctorUseCase) Unassign(ctx context.Context, proctorID, sessionID string) error {
	return uc.proctorDB.Unassign(ctx, proctorID, sessionID)
}

func (uc *ProctorUseCase) ListMySessions(ctx context.Context, proctorID string) ([]domain.ProctorSessionView, error) {
	return uc.proctorDB.ListByProctor(ctx, proctorID)
}

func (uc *ProctorUseCase) IsAssigned(ctx context.Context, proctorID, sessionID string) (bool, error) {
	return uc.proctorDB.IsProctorAssigned(ctx, proctorID, sessionID)
}

func (uc *ProctorUseCase) ListAll(ctx context.Context) ([]map[string]any, error) {
	return uc.proctorDB.ListAllProctors(ctx)
}
