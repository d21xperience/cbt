package usecase

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"time"

	"cbt-engine-service/internal/cbt/domain"
	"cbt-engine-service/internal/cbt/repository/sqlite"

	"github.com/google/uuid"
)

const tokenAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

type TokenUseCase struct {
	tokenDB   *sqlite.TokenDB
	sessionDB *sqlite.SessionDB
}

func NewTokenUseCase(tokenDB *sqlite.TokenDB, sessionDB *sqlite.SessionDB) *TokenUseCase {
	return &TokenUseCase{tokenDB: tokenDB, sessionDB: sessionDB}
}

// Rotate — generate token baru untuk session
func (uc *TokenUseCase) Rotate(ctx context.Context, sessionID, generatedBy string) (*domain.ExamToken, error) {
	sess, err := uc.sessionDB.GetSessionByID(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if sess == nil {
		return nil, errors.New("session tidak ditemukan")
	}

	code, err := generateToken(6)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	t := &domain.ExamToken{
		ID:          uuid.NewString(),
		SessionID:   sessionID,
		Token:       code,
		ValidFrom:   now,
		ValidUntil:  now.Add(time.Duration(domain.DefaultTokenRotationMinutes) * time.Minute),
		IsActive:    true,
		GeneratedBy: generatedBy,
	}

	if err := uc.tokenDB.CreateAndDeactivateOld(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

// Verify — cek apakah token valid saat ini untuk session tertentu
func (uc *TokenUseCase) Verify(ctx context.Context, sessionID, token string) (bool, error) {
	now := time.Now()
	t, err := uc.tokenDB.FindActiveBySession(ctx, sessionID)
	if err != nil {
		return false, err
	}
	if t == nil {
		return false, nil
	}
	if t.Token != token {
		return false, nil
	}
	if !t.IsValidAt(now) {
		return false, nil
	}
	return true, nil
}

// GetCurrent — untuk proctor view
func (uc *TokenUseCase) GetCurrent(ctx context.Context, sessionID string) (*domain.ExamToken, error) {
	return uc.tokenDB.FindActiveBySession(ctx, sessionID)
}

// EnsureActiveToken — dipakai oleh rotator; generate kalau belum ada
func (uc *TokenUseCase) EnsureActiveToken(ctx context.Context, sessionID string) (*domain.ExamToken, error) {
	now := time.Now()
	t, err := uc.tokenDB.FindActiveBySession(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if t != nil && t.IsValidAt(now) {
		return t, nil
	}
	return uc.Rotate(ctx, sessionID, "auto-rotator")
}

func generateToken(n int) (string, error) {
	b := make([]byte, n)
	for i := range b {
		idx, err := rand.Int(rand.Reader, big.NewInt(int64(len(tokenAlphabet))))
		if err != nil {
			return "", fmt.Errorf("gagal generate token: %w", err)
		}
		b[i] = tokenAlphabet[idx.Int64()]
	}
	return string(b), nil
}
