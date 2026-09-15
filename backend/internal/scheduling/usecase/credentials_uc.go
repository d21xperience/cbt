package usecase

import (
	"context"
	"fmt"
	"time"

	"cbt-engine-service/internal/crypto"
	"cbt-engine-service/internal/scheduling/domain"
	"cbt-engine-service/internal/scheduling/repository"
)

type CredentialsUseCase struct {
	credRepo *repository.CredentialsDB
	cipher   *crypto.Cipher
}

func NewCredentialsUseCase(repo *repository.CredentialsDB, c *crypto.Cipher) *CredentialsUseCase {
	return &CredentialsUseCase{credRepo: repo, cipher: c}
}

// GenerateForExam — bulk generate untuk semua eligible participants di exam_id tertentu
func (uc *CredentialsUseCase) GenerateForExam(ctx context.Context, examID string, generatedBy string, validDays int) ([]domain.ParticipantCredentialDTO, error) {
	// Ambil NISN unik dari eligible_participants
	nisnList, err := uc.listNISNByExam(ctx, examID)
	if err != nil {
		return nil, err
	}
	if len(nisnList) == 0 {
		return nil, fmt.Errorf("tidak ada peserta eligible di exam %s", examID)
	}

	var results []domain.ParticipantCredentialDTO
	for _, nisn := range nisnList {
		dto, err := uc.GenerateOne(ctx, nisn, generatedBy, validDays)
		if err != nil {
			return nil, fmt.Errorf("gagal generate untuk NISN %s: %w", nisn, err)
		}
		results = append(results, *dto)
	}
	return results, nil
}

// GenerateOne — generate untuk satu NISN
func (uc *CredentialsUseCase) GenerateOne(ctx context.Context, nisn, generatedBy string, validDays int) (*domain.ParticipantCredentialDTO, error) {
	plain, err := crypto.GenerateRandomPassword(6)
	if err != nil {
		return nil, err
	}
	enc, iv, err := uc.cipher.Encrypt(plain)
	if err != nil {
		return nil, err
	}

	cred := &domain.ParticipantCredential{
		NISN:        nisn,
		Username:    nisn,
		PasswordEnc: enc,
		PasswordIV:  iv,
		IsActive:    true,
		GeneratedBy: generatedBy,
	}

	if validDays > 0 {
		t := timeNow().AddDate(0, 0, validDays)
		cred.ValidUntil = &t
	}

	if err := uc.credRepo.Upsert(ctx, cred); err != nil {
		return nil, err
	}

	return &domain.ParticipantCredentialDTO{
		NISN:        cred.NISN,
		Username:    cred.Username,
		Password:    plain, // plain hanya dikembalikan di response ini (sekali)
		IsActive:    cred.IsActive,
		ValidUntil:  cred.ValidUntil,
		GeneratedAt: cred.GeneratedAt,
	}, nil
}

// ViewByExamID — admin lihat semua credential (dengan password decrypted)
func (uc *CredentialsUseCase) ViewByExamID(ctx context.Context, examID string) ([]domain.ParticipantCredentialDTO, error) {
	list, err := uc.credRepo.ListByExamID(ctx, examID)
	if err != nil {
		return nil, err
	}
	var out []domain.ParticipantCredentialDTO
	for _, c := range list {
		plain, err := uc.cipher.Decrypt(c.PasswordEnc, c.PasswordIV)
		if err != nil {
			plain = "<decrypt-error>"
		}
		out = append(out, domain.ParticipantCredentialDTO{
			NISN:        c.NISN,
			Username:    c.Username,
			Password:    plain,
			IsActive:    c.IsActive,
			ValidUntil:  c.ValidUntil,
			GeneratedAt: c.GeneratedAt,
		})
	}
	return out, nil
}

func (uc *CredentialsUseCase) listNISNByExam(ctx context.Context, examID string) ([]string, error) {
	// reuse CredentialsDB.DB via repo — tambah method di repo
	return uc.credRepo.ListNISNByExam(ctx, examID)
}

// helper — mudah diganti di test
var timeNow = func() time.Time { return time.Now() }
