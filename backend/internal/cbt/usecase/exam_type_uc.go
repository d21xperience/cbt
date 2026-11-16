package usecase

import (
	"cbt-engine-service/internal/cbt/domain"
	"cbt-engine-service/internal/cbt/repository/sqlite"
	"context"
	"github.com/google/uuid"
	"strings"
)

type ExamTypeUseCase struct{ repo *sqlite.ExamTypeDB }

func NewExamTypeUseCase(r *sqlite.ExamTypeDB) *ExamTypeUseCase { return &ExamTypeUseCase{repo: r} }

func (uc *ExamTypeUseCase) List(ctx context.Context) ([]domain.ExamType, error) {
	return uc.repo.List(ctx)
}

func (uc *ExamTypeUseCase) Create(ctx context.Context, req domain.ExamType) (*domain.ExamType, error) {
	req.Kode = strings.ToUpper(strings.TrimSpace(req.Kode))
	req.Nama = strings.TrimSpace(req.Nama)
	if req.Kode == "" || req.Nama == "" {
		return nil, domain.ErrExamTypeInvalid
	}

	exists, _ := uc.repo.ExistsKode(ctx, req.Kode, "")
	if exists {
		return nil, domain.ErrExamTypeKodeTaken
	}

	req.ID = uuid.NewString()
	if err := uc.repo.Create(ctx, &req); err != nil {
		return nil, err
	}
	return &req, nil
}

func (uc *ExamTypeUseCase) Update(ctx context.Context, id string, req domain.ExamType) (*domain.ExamType, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil || existing == nil {
		return nil, domain.ErrExamTypeNotFound
	}

	if req.Kode != "" && strings.ToUpper(req.Kode) != existing.Kode {
		exists, _ := uc.repo.ExistsKode(ctx, req.Kode, id)
		if exists {
			return nil, domain.ErrExamTypeKodeTaken
		}
		existing.Kode = strings.ToUpper(req.Kode)
	}
	if req.Nama != "" {
		existing.Nama = req.Nama
	}
	if req.Deskripsi != "" {
		existing.Deskripsi = req.Deskripsi
	}

	if err := uc.repo.Update(ctx, existing); err != nil {
		return nil, err
	}
	return existing, nil
}

func (uc *ExamTypeUseCase) Delete(ctx context.Context, id string) error {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil || existing == nil {
		return domain.ErrExamTypeNotFound
	}

	// Proteksi default
	if existing.Kode == "UTS" || existing.Kode == "UAS" {
		return domain.ErrExamTypeInUse
	}

	return uc.repo.Delete(ctx, id)
}
