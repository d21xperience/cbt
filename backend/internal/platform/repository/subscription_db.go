package repository

import (
	"context"
	"database/sql"
	"time"

	"cbt-engine-service/internal/platform/domain"
)

type SubscriptionDB struct {
	DB *sql.DB
}

func NewSubscriptionDB(db *sql.DB) *SubscriptionDB {
	return &SubscriptionDB{DB: db}
}

func (r *SubscriptionDB) Create(ctx context.Context, s *domain.Subscription) error {
	const q = `
		INSERT INTO subscriptions (tenant_id, plan, valid_from, valid_until, is_active, price_idr, notes)
		VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err := r.DB.ExecContext(ctx, q,
		s.TenantID, s.Plan,
		s.ValidFrom.UTC().Format(time.RFC3339),
		s.ValidUntil.UTC().Format(time.RFC3339),
		boolToInt(s.IsActive), s.PriceIDR, s.Notes,
	)
	return err
}

func (r *SubscriptionDB) GetActiveByTenant(ctx context.Context, tenantID string) (*domain.Subscription, error) {
	const q = `
		SELECT id, tenant_id, plan, valid_from, valid_until, is_active, price_idr, COALESCE(notes, '')
		FROM subscriptions
		WHERE tenant_id = ? AND is_active = 1 AND valid_until > CURRENT_TIMESTAMP
		ORDER BY valid_until DESC LIMIT 1`
	row := r.DB.QueryRowContext(ctx, q, tenantID)

	var s domain.Subscription
	var vf, vu string
	var active int

	err := row.Scan(&s.ID, &s.TenantID, &s.Plan, &vf, &vu, &active, &s.PriceIDR, &s.Notes)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	s.IsActive = active == 1
	s.ValidFrom = parseTime(vf)
	s.ValidUntil = parseTime(vu)
	return &s, nil
}
