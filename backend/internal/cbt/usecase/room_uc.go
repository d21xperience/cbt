package usecase

import (
	"cbt-engine-service/internal/cbt/domain"
	"cbt-engine-service/internal/cbt/repository/sqlite"
	"context"
	"github.com/google/uuid"
)

type RoomUseCase struct{ repo *sqlite.RoomDB }

func NewRoomUseCase(r *sqlite.RoomDB) *RoomUseCase                      { return &RoomUseCase{repo: r} }
func (uc *RoomUseCase) List(ctx context.Context) ([]domain.Room, error) { return uc.repo.List(ctx) }

func (uc *RoomUseCase) Create(ctx context.Context, r domain.Room) error {
	r.ID = uuid.NewString()
	return uc.repo.Create(ctx, &r)
}

func (uc *RoomUseCase) Update(ctx context.Context, id string, r domain.Room) error {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil || existing == nil {
		return err
	}
	if r.Nama != "" {
		existing.Nama = r.Nama
	}
	if r.Kapasitas != 0 {
		existing.Kapasitas = r.Kapasitas
	}
	if r.Gedung != "" {
		existing.Gedung = r.Gedung
	}
	return uc.repo.Update(ctx, existing)
}

func (uc *RoomUseCase) Delete(ctx context.Context, id string) error {
	return uc.repo.Delete(ctx, id)
}
