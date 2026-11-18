package usecase

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"

	"cbt-engine-service/internal/cbt/domain"
	"cbt-engine-service/internal/cbt/repository/sqlite"
	"cbt-engine-service/internal/crypto"
)

type ParticipantUseCase struct {
	repo   *sqlite.ParticipantDB
	cipher *crypto.Cipher
}

func NewParticipantUseCase(repo *sqlite.ParticipantDB, cipher *crypto.Cipher) *ParticipantUseCase {
	return &ParticipantUseCase{
		repo:   repo,
		cipher: cipher,
	}
}

func (uc *ParticipantUseCase) ToggleExamMode(ctx context.Context, mode string, students []domain.Siswa) error {
	var creds []sqlite.EncryptedCredential

	// Jika mode dinyalakan (bukan string kosong), kita generate password baru
	if mode != "" {
		for _, s := range students {
			if s.NISN == "" {
				continue
			}

			// Generate password plain (6 karakter)
			plainPass := generateRandomPassword(6)

			encStr, ivStr, err := uc.cipher.Encrypt(plainPass)
			if err != nil {
				return fmt.Errorf("gagal enkripsi password untuk %s: %w", s.NISN, err)
			}

			creds = append(creds, sqlite.EncryptedCredential{
				NISN:          s.NISN,
				Username:      s.NISN,
				EncryptedPass: []byte(encStr),
				IV:            []byte(ivStr),
			})
		}
	}

	return uc.repo.ToggleExamModeAndReset(ctx, mode, creds)
}

// GetExamMode membaca status mode ujian dari tenant_settings.
// Dipanggil oleh HandleLogin untuk menyisipkan exam_mode ke response JSON.
func (uc *ParticipantUseCase) GetExamMode(ctx context.Context) (string, error) {
	return uc.repo.GetExamMode(ctx)
}

// generateRandomPassword menggunakan crypto/rand agar aman
func generateRandomPassword(length int) string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			b[i] = charset[0] // fallback if rand fails
			continue
		}
		b[i] = charset[num.Int64()]
	}
	return string(b)
}

// GetExamCards mengambil data kartu ujian dan mendekripsi password
func (uc *ParticipantUseCase) GetExamCards(ctx context.Context, classID, search string) ([]domain.ExamCardDTO, error) {
	rows, err := uc.repo.GetExamCards(ctx, classID, search)
	if err != nil {
		return nil, err
	}

	var cards []domain.ExamCardDTO
	for _, row := range rows {
		password := "<not-generated>"
		if len(row.PasswordEnc) > 0 && len(row.PasswordIV) > 0 {
			if plain, decErr := uc.cipher.Decrypt(row.PasswordEnc, row.PasswordIV); decErr == nil {
				password = plain
			} else {
				password = "<decrypt-error>"
			}
		}

		cardType := "PERMANENT"
		if row.IsBlocked == 1 {
			cardType = "TEMPORARY"
		}

		cards = append(cards, domain.ExamCardDTO{
			ID:          row.StudentID,
			CardNumber:  "CRD-" + row.StudentID,
			StudentID:   row.StudentID,
			StudentName: row.StudentName,
			StudentNIS:  row.StudentNIS,
			StudentNISN: row.NISN,
			ClassID:     row.ClassID,
			ClassNama:   row.ClassNama,
			Username:    row.Username,
			Password:    password,
			CardType:    cardType,
			Status:      "ACTIVE",
			Reason:      row.Reason,
		})
	}
	return cards, nil
}
