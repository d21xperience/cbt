package usecase

import (
	"cbt-engine-service/internal/cbt/domain"
	"cbt-engine-service/internal/cbt/repository/sqlite"
	"context"
	"github.com/google/uuid"
)

type ExamScheduleUseCase struct{ repo *sqlite.ExamScheduleDB }

func NewExamScheduleUseCase(r *sqlite.ExamScheduleDB) *ExamScheduleUseCase {
	return &ExamScheduleUseCase{repo: r}
}

func (uc *ExamScheduleUseCase) List(ctx context.Context) ([]domain.ExamSchedule, error) {
	return uc.repo.List(ctx)
}

func (uc *ExamScheduleUseCase) Create(ctx context.Context, req domain.ExamSchedule) (*domain.ExamSchedule, error) {
	if req.LessonID == "" || req.JenisUjianID == "" || req.Tanggal == "" || req.JamMulai == "" {
		return nil, domain.ErrExamScheduleInvalid
	}
	req.ID = uuid.NewString()
	if req.Status == "" {
		req.Status = "DRAFT"
	}

	// Dapatkan periode aktif jika tidak dikirim
	if req.AcademicPeriodID == "" {
		req.AcademicPeriodID = uc.repo.GetActivePeriodID(ctx)
	}

	if err := uc.repo.CreateWithSync(ctx, &req); err != nil {
		return nil, err
	}
	return &req, nil
}

func (uc *ExamScheduleUseCase) Update(ctx context.Context, id string, req domain.ExamSchedule) error {
	req.ID = id
	return uc.repo.UpdateWithSync(ctx, &req)
}

func (uc *ExamScheduleUseCase) Delete(ctx context.Context, id string) error {
	return uc.repo.Delete(ctx, id)
}

func (uc *ExamScheduleUseCase) ListByPeriodID(ctx context.Context, periodID string) ([]domain.ExamSchedule, error) {
	return uc.repo.ListByPeriodID(ctx, periodID)
}
