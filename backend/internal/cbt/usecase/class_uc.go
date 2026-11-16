package usecase

import (
	"context"

	"cbt-engine-service/internal/cbt/domain"
	cbtRepo "cbt-engine-service/internal/cbt/repository/sqlite"

	"github.com/google/uuid"
)

type ClassUseCase struct {
	repo *cbtRepo.ClassDB
}

func NewClassUseCase(repo *cbtRepo.ClassDB) *ClassUseCase {
	return &ClassUseCase{repo: repo}
}

func (uc *ClassUseCase) List(ctx context.Context) ([]domain.Class, error) {
	return uc.repo.List(ctx)
}

func (uc *ClassUseCase) Create(ctx context.Context, req domain.Class) (*domain.Class, error) {
	if req.Nama == "" || req.Tingkat == 0 {
		return nil, domain.ErrClassInvalid
	}
	// Inject periode aktif jika tidak diset
	if req.AcademicPeriodID == "" {
		pid, ay, smt := uc.getActivePeriod(ctx)
		req.AcademicPeriodID, req.AcademicYear, req.Semester = pid, ay, smt
	}
	req.ID = uuid.NewString()
	if err := uc.repo.Create(ctx, &req); err != nil {
		return nil, err
	}
	return &req, nil
}

func (uc *ClassUseCase) Update(ctx context.Context, id string, req domain.Class) (*domain.Class, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil || existing == nil {
		return nil, domain.ErrClassNotFound
	}

	if req.Nama != "" {
		existing.Nama = req.Nama
	}
	if req.Tingkat != 0 {
		existing.Tingkat = req.Tingkat
	}
	if req.Kurikulum != "" {
		existing.Kurikulum = req.Kurikulum
	}
	if req.JenisRombel != "" {
		existing.JenisRombel = req.JenisRombel
	}
	if req.ProgramKeahlianID != "" {
		existing.ProgramKeahlianID = req.ProgramKeahlianID
	}
	if req.WaliKelasID != "" {
		existing.WaliKelasID = req.WaliKelasID
	}
	if req.RuangID != "" {
		existing.RuangID = req.RuangID
	}

	if err := uc.repo.Update(ctx, existing); err != nil {
		return nil, err
	}
	return existing, nil
}

func (uc *ClassUseCase) Delete(ctx context.Context, id string) error {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil || existing == nil {
		return domain.ErrClassNotFound
	}
	return uc.repo.Delete(ctx, id)
}

func (uc *ClassUseCase) getActivePeriod(ctx context.Context) (string, string, string) {
	var id, ay, smt string
	_ = uc.repo.DB.QueryRowContext(ctx, `SELECT id, academic_year, semester FROM academic_periods WHERE is_active = 1 LIMIT 1`).Scan(&id, &ay, &smt)
	if id == "" {
		id = "20251"
	}
	if ay == "" {
		ay = "2025/2026"
	}
	if smt == "" {
		smt = "GANJIL"
	}
	return id, ay, smt
}
