package usecase

import (
	"context"
	"errors"

	"cbt-engine-service/internal/crypto"
	"cbt-engine-service/internal/scheduling/domain"
	"cbt-engine-service/internal/scheduling/repository"

	"time"
)

var (
	ErrInvalidCredential = errors.New("Username atau password salah")
	ErrCredentialExpired = errors.New("Kartu ujian sudah kadaluarsa")
)

type ParticipantAuthUseCase struct {
	credRepo *repository.CredentialsDB
	cipher   *crypto.Cipher
}

func NewParticipantAuthUseCase(repo *repository.CredentialsDB, c *crypto.Cipher) *ParticipantAuthUseCase {
	return &ParticipantAuthUseCase{credRepo: repo, cipher: c}
}

// Login — validasi username/password, return info peserta + exam_ids
func (uc *ParticipantAuthUseCase) Login(ctx context.Context, username, password string) (*domain.ParticipantAuthResult, error) {
	cred, err := uc.credRepo.FindByUsername(ctx, username)
	if err != nil {
		return nil, err
	}
	if cred == nil {
		time.Sleep(50 * time.Millisecond)
		return nil, ErrInvalidCredential
	}
	if !cred.IsActive {
		return nil, ErrInvalidCredential
	}
	if cred.ValidUntil != nil && time.Now().After(*cred.ValidUntil) {
		return nil, ErrCredentialExpired
	}

	plain, err := uc.cipher.Decrypt(cred.PasswordEnc, cred.PasswordIV)
	if err != nil {
		return nil, ErrInvalidCredential
	}
	if plain != password {
		return nil, ErrInvalidCredential
	}

	// ✅ FIX: dapatkan participant_id (UUID) juga
	participantID, examIDs, name, rombel, err := uc.credRepo.GetEligibleExamsByNISN(ctx, cred.NISN)
	if err != nil {
		return nil, err
	}

	return &domain.ParticipantAuthResult{
		ParticipantID: participantID, // ← NEW
		NISN:          cred.NISN,
		FullName:      name,
		RombelName:    rombel,
		ExamIDs:       examIDs,
	}, nil
}
