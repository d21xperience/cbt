package usecase

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"time"

	"cbt-engine-service/internal/cbt/domain"
	"cbt-engine-service/internal/cbt/repository/sqlite"
	"cbt-engine-service/internal/crypto"
	"cbt-engine-service/pkg/auth"
	"database/sql"

	"github.com/google/uuid"
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

func (uc *ParticipantUseCase) ToggleExamMode(ctx context.Context, mode string, students []domain.Siswa, tenantID string) error {
	var creds []sqlite.EncryptedCredential

	if tenantID == "" {
		tenantID = "default"
	}

	// Jika mode dinyalakan (bukan string kosong), generate password + qr_token baru.
	// DELETE+INSERT di repo akan mencabut SEMUA kartu periode sebelumnya (desain).
	if mode != "" {
		for _, s := range students {
			if s.NISN == "" {
				continue
			}

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
				TenantID:      tenantID,
				QrToken:       uuid.NewString(),
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

		// Auto-generate QR token jika belum ada (Lazy Generation).
		// Pakai nisn (PK participant_credentials) agar konsisten dgn Arah B.
		qrToken := row.QrToken
		if qrToken == "" && row.NISN != "" {
			qrToken = uuid.NewString()
			_, _ = uc.repo.DB.ExecContext(ctx,
				`UPDATE participant_credentials SET qr_token = ? WHERE nisn = ?`,
				qrToken, row.NISN)
		}

		cardType := "PERMANENT"
		if row.IsBlocked == 1 {
			cardType = "TEMPORARY"
		}

		cards = append(cards, domain.ExamCardDTO{
			ID:                row.StudentID,
			CardNumber:        "CRD-" + row.StudentID,
			StudentID:         row.StudentID,
			StudentName:       row.StudentName,
			StudentNIS:        row.StudentNIS,
			StudentNISN:       row.NISN,
			ClassID:           row.ClassID,
			ClassNama:         row.ClassNama,
			Username:          row.Username,
			Password:          password,
			CardType:          cardType,
			Status:            "ACTIVE",
			Reason:            row.Reason,
			QrToken:           qrToken,
			DeviceFingerprint: row.DeviceFingerprint,
			IsRevoked:         row.IsRevoked == 1,
		})
	}
	return cards, nil
}

// RevokeCard mencabut kartu berdasarkan NIS atau NISN.
// participant_credentials.username = NISN, jadi resolve dulu lewat siswa.
func (uc *ParticipantUseCase) RevokeCard(ctx context.Context, nisOrNisn string) error {
	_, err := uc.repo.DB.ExecContext(ctx, `
		UPDATE participant_credentials
		SET is_revoked = 1
		WHERE nisn = (
			SELECT nisn FROM siswa
			WHERE nis = ? OR nisn = ?
			LIMIT 1
		)
	`, nisOrNisn, nisOrNisn)
	return err
}

// ResetDevice mereset device binding, generate qr_token baru, dan mengaktifkan kembali kartu.
func (uc *ParticipantUseCase) ResetDevice(ctx context.Context, nisOrNisn string) (string, error) {
	newQrToken := uuid.NewString()
	_, err := uc.repo.DB.ExecContext(ctx, `
		UPDATE participant_credentials
		SET device_fingerprint = NULL,
		    qr_token = ?,
		    is_revoked = 0
		WHERE nisn = (
			SELECT nisn FROM siswa
			WHERE nis = ? OR nisn = ?
			LIMIT 1
		)
	`, newQrToken, nisOrNisn, nisOrNisn)
	if err != nil {
		return "", err
	}
	return newQrToken, nil
}

// GenerateQrToken membuat token QR baru untuk NIS/NISN (tanpa reset device, tanpa un-revoke).
func (uc *ParticipantUseCase) GenerateQrToken(ctx context.Context, nisOrNisn string) (string, error) {
	newQrToken := uuid.NewString()
	_, err := uc.repo.DB.ExecContext(ctx, `
		UPDATE participant_credentials
		SET qr_token = ?
		WHERE nisn = (
			SELECT nisn FROM siswa
			WHERE nis = ? OR nisn = ?
			LIMIT 1
		)
	`, newQrToken, nisOrNisn, nisOrNisn)
	if err != nil {
		return "", err
	}
	return newQrToken, nil
}

// LoginByQrToken resolve token ke data siswa dan generate JWT
func (uc *ParticipantUseCase) LoginByQrToken(ctx context.Context, token string, tenantID string) (*domain.Siswa, string, error) {
	var nisn string
	var isRevoked int

	// 1. Resolve token ke kredensial (PK = nisn; kolom "nis" tidak ada di tabel ini)
	err := uc.repo.DB.QueryRowContext(ctx, `
		SELECT nisn, COALESCE(is_revoked, 0)
		FROM participant_credentials
		WHERE qr_token = ? AND is_active = 1
	`, token).Scan(&nisn, &isRevoked)

	if err == sql.ErrNoRows {
		return nil, "", fmt.Errorf("token QR tidak valid atau kartu sudah dicabut")
	}
	if err != nil {
		return nil, "", err
	}
	if isRevoked == 1 {
		return nil, "", fmt.Errorf("kartu ini telah dicabut")
	}

	// 2. Ambil data siswa lengkap (cari via nisn — konsisten dengan PK credential)
	var siswa domain.Siswa
	err = uc.repo.DB.QueryRowContext(ctx, `
		SELECT id, nis, COALESCE(nisn, ''), nama, COALESCE(jenis_kelamin, ''),
		       COALESCE(kelas_id, ''), COALESCE(kelas_nama, '')
		FROM siswa WHERE nisn = ?
	`, nisn).Scan(&siswa.ID, &siswa.NIS, &siswa.NISN, &siswa.Nama, &siswa.JenisKelamin, &siswa.KelasID, &siswa.KelasNama)

	if err != nil {
		return nil, "", fmt.Errorf("data siswa tidak ditemukan: %w", err)
	}

	// 3. JWT — durasi disamakan dengan login manual (6 jam)
	jwtToken, err := auth.GenerateTokenFull(siswa.ID, "PARTICIPANT", "", tenantID, 6*time.Hour)
	if err != nil {
		return nil, "", err
	}

	return &siswa, jwtToken, nil
}

// GetSetting mengambil nilai setting dari database
func (uc *ParticipantUseCase) GetSetting(ctx context.Context, key string) (string, error) {
	return uc.repo.GetSetting(ctx, key)
}

// SetSetting menyimpan nilai setting ke database
func (uc *ParticipantUseCase) SetSetting(ctx context.Context, key, value string) error {
	return uc.repo.SetSetting(ctx, key, value)
}
