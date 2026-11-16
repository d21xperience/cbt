package usecase

import (
	"cbt-engine-service/internal/cbt/domain"
	"cbt-engine-service/internal/cbt/repository/sqlite"
	"context"
	"github.com/google/uuid"
	"strings"
)

type SubjectUseCase struct{ repo *sqlite.SubjectDB }

func NewSubjectUseCase(r *sqlite.SubjectDB) *SubjectUseCase { return &SubjectUseCase{repo: r} }

func (uc *SubjectUseCase) List(ctx context.Context) ([]domain.Subject, error) {
	return uc.repo.List(ctx)
}

func (uc *SubjectUseCase) Create(ctx context.Context, req domain.Subject) (*domain.Subject, error) {
	req.Kode = strings.TrimSpace(req.Kode)
	req.Nama = strings.TrimSpace(req.Nama)

	if req.Kode == "" || req.Nama == "" || req.NamaSingkat == "" || req.Kelompok == "" || req.Tingkat == "" {
		return nil, domain.ErrSubjectInvalid
	}
	if req.Kelompok == "KEJURUAN" && req.JurusanID == "" {
		return nil, domain.ErrSubjectInvalid
	}

	if exists, _ := uc.repo.ExistsKode(ctx, req.Kode, ""); exists {
		return nil, domain.ErrSubjectKodeTaken
	}

	req.ID = uuid.NewString()
	if err := uc.repo.Create(ctx, &req); err != nil {
		return nil, err
	}
	return &req, nil
}

func (uc *SubjectUseCase) Update(ctx context.Context, id string, req domain.Subject) (*domain.Subject, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil || existing == nil {
		return nil, domain.ErrSubjectNotFound
	}

	if req.Kode != "" && req.Kode != existing.Kode {
		if exists, _ := uc.repo.ExistsKode(ctx, req.Kode, id); exists {
			return nil, domain.ErrSubjectKodeTaken
		}
		existing.Kode = req.Kode
	}
	if req.Nama != "" {
		existing.Nama = req.Nama
	}
	if req.NamaSingkat != "" {
		existing.NamaSingkat = req.NamaSingkat
	}
	if req.Kelompok != "" {
		existing.Kelompok = req.Kelompok
	}
	if req.Tingkat != "" {
		existing.Tingkat = req.Tingkat
	}
	if req.JurusanID != "" {
		existing.JurusanID = req.JurusanID
	}

	if existing.Kelompok != "KEJURUAN" {
		existing.JurusanID = ""
	}
	if existing.Kelompok == "KEJURUAN" && existing.JurusanID == "" {
		return nil, domain.ErrSubjectInvalid
	}

	if err := uc.repo.Update(ctx, existing); err != nil {
		return nil, err
	}
	return existing, nil
}

func (uc *SubjectUseCase) Delete(ctx context.Context, id string) error {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil || existing == nil {
		return domain.ErrSubjectNotFound
	}

	if existing.Kode == "KKA-10" {
		return domain.ErrSubjectInUse
	}

	return uc.repo.Delete(ctx, id)
}
