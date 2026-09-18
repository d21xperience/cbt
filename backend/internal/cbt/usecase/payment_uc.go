package usecase

import (
	"context"

	"cbt-engine-service/internal/cbt/domain"
	"cbt-engine-service/internal/cbt/repository/sqlite"
)

type PaymentUseCase struct {
	db *sqlite.PaymentDB
}

func NewPaymentUseCase(db *sqlite.PaymentDB) *PaymentUseCase {
	return &PaymentUseCase{db: db}
}

func (uc *PaymentUseCase) IsBlocked(ctx context.Context, nisn string) (bool, string, error) {
	return uc.db.IsBlocked(ctx, nisn)
}

func (uc *PaymentUseCase) Block(ctx context.Context, nisn, reason, by, note string) error {
	return uc.db.Block(ctx, nisn, reason, by, note)
}

func (uc *PaymentUseCase) Unblock(ctx context.Context, nisn, by, note string) error {
	return uc.db.Unblock(ctx, nisn, by, note)
}

func (uc *PaymentUseCase) ListBlocked(ctx context.Context) ([]domain.PaymentGate, error) {
	return uc.db.ListBlocked(ctx)
}
