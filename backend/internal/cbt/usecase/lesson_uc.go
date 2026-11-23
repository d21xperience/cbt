package usecase

import (
	"cbt-engine-service/internal/cbt/domain"
	"cbt-engine-service/internal/cbt/repository/sqlite"
	"context"

	"github.com/google/uuid"
)

type LessonUseCase struct{ repo *sqlite.LessonDB }

func NewLessonUseCase(r *sqlite.LessonDB) *LessonUseCase { return &LessonUseCase{repo: r} }

func (uc *LessonUseCase) List(ctx context.Context) ([]domain.Lesson, error) { return uc.repo.List(ctx) }

func (uc *LessonUseCase) Create(ctx context.Context, req domain.Lesson) (*domain.Lesson, error) {
	if req.SubjectID == "" || req.ClassID == "" || req.TeacherID == "" {
		return nil, domain.ErrLessonInvalid
	}
	if req.AcademicPeriodID == "" {
		pid, _, _ := uc.getActivePeriod(ctx)
		req.AcademicPeriodID = pid
	}

	exists, _ := uc.repo.Exists(ctx, req.SubjectID, req.ClassID, req.AcademicPeriodID, "")
	if exists {
		return nil, domain.ErrLessonDuplicate
	}

	req.ID = uuid.NewString()
	if err := uc.repo.Create(ctx, &req); err != nil {
		return nil, err
	}
	return &req, nil
}

func (uc *LessonUseCase) Update(ctx context.Context, id string, req domain.Lesson) (*domain.Lesson, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil || existing == nil {
		return nil, domain.ErrLessonNotFound
	}

	if req.SubjectID != "" {
		existing.SubjectID = req.SubjectID
	}
	if req.ClassID != "" {
		existing.ClassID = req.ClassID
	}
	if req.TeacherID != "" {
		existing.TeacherID = req.TeacherID
	}
	// ✅ Update is_exam_author
	existing.IsExamAuthor = req.IsExamAuthor

	exists, _ := uc.repo.Exists(ctx, existing.SubjectID, existing.ClassID, existing.AcademicPeriodID, id)
	if exists {
		return nil, domain.ErrLessonDuplicate
	}

	if err := uc.repo.Update(ctx, existing); err != nil {
		return nil, err
	}
	return existing, nil
}

func (uc *LessonUseCase) Delete(ctx context.Context, id string) error {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil || existing == nil {
		return domain.ErrLessonNotFound
	}
	return uc.repo.Delete(ctx, id)
}

func (uc *LessonUseCase) getActivePeriod(ctx context.Context) (string, string, string) {
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

func (uc *LessonUseCase) ListByPeriodID(ctx context.Context, periodID string) ([]domain.Lesson, error) {
	return uc.repo.ListByPeriodID(ctx, periodID)
}
