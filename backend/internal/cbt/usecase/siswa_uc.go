package usecase

import (
	"context"
	"log"
	"strings"
	"time"

	cbtDomain "cbt-engine-service/internal/cbt/domain"
	cbtRepo "cbt-engine-service/internal/cbt/repository/sqlite"
	"cbt-engine-service/internal/crypto"
	schedDomain "cbt-engine-service/internal/scheduling/domain"
	schedRepo "cbt-engine-service/internal/scheduling/repository"

	"github.com/google/uuid"
)

type SiswaUseCase struct {
	siswaDB *cbtRepo.SiswaDB
	credDB  *schedRepo.CredentialsDB
	cipher  *crypto.Cipher
}

func NewSiswaUseCase(
	siswaDB *cbtRepo.SiswaDB,
	credDB *schedRepo.CredentialsDB,
	cipher *crypto.Cipher,
) *SiswaUseCase {
	return &SiswaUseCase{siswaDB: siswaDB, credDB: credDB, cipher: cipher}
}

// List — return siswa + exam_password (decrypt) — untuk admin.
func (uc *SiswaUseCase) List(ctx context.Context, f cbtDomain.SiswaFilter) ([]cbtDomain.Siswa, error) {
	list, err := uc.siswaDB.List(ctx, f)
	if err != nil {
		return nil, err
	}
	for i := range list {
		uc.attachPassword(ctx, &list[i])
	}
	return list, nil
}

func (uc *SiswaUseCase) GetByID(ctx context.Context, id string) (*cbtDomain.Siswa, error) {
	s, err := uc.siswaDB.GetByID(ctx, id)
	if err != nil || s == nil {
		return s, err
	}
	uc.attachPassword(ctx, s)
	return s, nil
}

// Create — buat siswa + credential (random password).
// Return siswa + plaintext password (sekali saja).
func (uc *SiswaUseCase) Create(ctx context.Context, req cbtDomain.Siswa) (*cbtDomain.Siswa, string, error) {
	if req.NIS == "" || req.Nama == "" {
		return nil, "", cbtDomain.ErrSiswaInvalidInput
	}
	if ok, _ := uc.siswaDB.ExistsNIS(ctx, req.NIS); ok {
		return nil, "", cbtDomain.ErrSiswaNISDuplicated
	}
	if req.NISN != "" {
		if ok, _ := uc.siswaDB.ExistsNISN(ctx, req.NISN); ok {
			return nil, "", cbtDomain.ErrSiswaNISNDuplicated
		}
	}
	if req.JenisKelamin == "" {
		req.JenisKelamin = "L"
	}
	req.ID = uuid.NewString()

	if err := uc.siswaDB.Create(ctx, &req); err != nil {
		return nil, "", err
	}

	// ✅ FIX: hindari shadow, tangani error credential secara eksplisit.
	plainCred := ""
	if req.NISN != "" {
		cred, credErr := uc.generateCredential(ctx, req.NISN)
		if credErr != nil {
			// Siswa sudah tersimpan — JANGAN fail-kan operasi karena credential.
			// Catat di log supaya bisa re-issue via endpoint terpisah.
			log.Printf("[SiswaUseCase.Create] generateCredential failed for nisn=%s (siswa sudah tersimpan, id=%s): %v",
				req.NISN, req.ID, credErr)
		} else {
			plainCred = cred
			req.ExamPassword = cred
		}
	}

	return &req, plainCred, nil
}

// BulkCreate — batch insert siswa (untuk import).
// Return jumlah yang berhasil di-insert.
func (uc *SiswaUseCase) BulkCreate(ctx context.Context, list []cbtDomain.Siswa) (int, error) {
	return uc.siswaDB.BulkCreate(ctx, list)
}

// Update — update field siswa. NIS & NISN tidak boleh diubah tanpa
// regenerate credential.
func (uc *SiswaUseCase) Update(ctx context.Context, id string, req cbtDomain.Siswa) (*cbtDomain.Siswa, error) {
	existing, err := uc.siswaDB.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, cbtDomain.ErrSiswaNotFound
	}

	// Trim spaces untuk mencegah mismatch (misal: "123 " vs "123")
	req.NIS = strings.TrimSpace(req.NIS)
	req.NISN = strings.TrimSpace(req.NISN)

	// Validasi NIS / NISN (Izinkan pengisian jika sebelumnya kosong)
	if req.NIS != "" && req.NIS != existing.NIS {
		if ok, _ := uc.siswaDB.ExistsNIS(ctx, req.NIS); ok {
			return nil, cbtDomain.ErrSiswaNISDuplicated
		}
	}
	if req.NISN != "" && req.NISN != existing.NISN {
		if ok, _ := uc.siswaDB.ExistsNISN(ctx, req.NISN); ok {
			return nil, cbtDomain.ErrSiswaNISNDuplicated
		}
	}

	// merge field
	if req.NIS != "" {
		existing.NIS = req.NIS
	}
	if req.NISN != "" {
		existing.NISN = req.NISN
	}
	if req.Nama != "" {
		existing.Nama = req.Nama
	}
	if req.JenisKelamin != "" {
		existing.JenisKelamin = req.JenisKelamin
	}
	if req.TanggalLahir != "" {
		existing.TanggalLahir = req.TanggalLahir
	}
	if req.KelasID != "" {
		existing.KelasID = req.KelasID
	}
	if req.KelasNama != "" {
		existing.KelasNama = req.KelasNama
	}
	if req.PhotoURL != nil {
		existing.PhotoURL = req.PhotoURL
	}

	if err := uc.siswaDB.Update(ctx, existing); err != nil {
		return nil, err
	}
	uc.attachPassword(ctx, existing)
	return existing, nil
}

// Delete — hard delete siswa + credential.
func (uc *SiswaUseCase) Delete(ctx context.Context, id string) error {
	s, err := uc.siswaDB.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if s == nil {
		return cbtDomain.ErrSiswaNotFound
	}
	if s.NISN != "" {
		_ = uc.credDB.DeleteByNISN(ctx, s.NISN)
	}
	return uc.siswaDB.Delete(ctx, id)
}

// ResetPassword — generate password baru (random), update credential.
func (uc *SiswaUseCase) ResetPassword(ctx context.Context, id string) (string, error) {
	s, err := uc.siswaDB.GetByID(ctx, id)
	if err != nil {
		return "", err
	}
	if s == nil {
		return "", cbtDomain.ErrSiswaNotFound
	}
	if s.NISN == "" {
		return "", cbtDomain.ErrSiswaInvalidInput
	}
	return uc.generateCredential(ctx, s.NISN)
}

// LoginByNIS — auth siswa (dipakai oleh /auth/exam/login).
// Return siswa + JWT-A identity (uid = siswa.id).
func (uc *SiswaUseCase) LoginByNIS(ctx context.Context, nis, password string) (*cbtDomain.Siswa, error) {
	s, err := uc.siswaDB.GetByNIS(ctx, nis)
	if err != nil {
		return nil, err
	}
	if s == nil {
		return nil, cbtDomain.ErrSiswaNotFound
	}
	if s.NISN == "" {
		return nil, cbtDomain.ErrSiswaInvalidInput
	}

	cred, err := uc.credDB.FindByUsername(ctx, s.NISN)
	if err != nil || cred == nil {
		return nil, cbtDomain.ErrSiswaNotFound
	}
	if !cred.IsActive {
		return nil, cbtDomain.ErrSiswaNotFound
	}
	plain, err := uc.cipher.Decrypt(cred.PasswordEnc, cred.PasswordIV)
	if err != nil || strings.TrimSpace(plain) != strings.TrimSpace(password) {
		return nil, cbtDomain.ErrSiswaNotFound
	}

	uc.attachPassword(ctx, s)
	return s, nil
}

// === helpers ===

func (uc *SiswaUseCase) attachPassword(ctx context.Context, s *cbtDomain.Siswa) {
	if s.NISN == "" {
		return
	}
	cred, err := uc.credDB.FindByUsername(ctx, s.NISN)
	if err != nil || cred == nil {
		return
	}
	plain, err := uc.cipher.Decrypt(cred.PasswordEnc, cred.PasswordIV)
	if err == nil {
		s.ExamPassword = plain
	}
	s.Source = "SISWA"
}

// generateCredential — password random 6-char, upsert ke participant_credentials.
func (uc *SiswaUseCase) generateCredential(ctx context.Context, nisn string) (string, error) {
	plain, err := crypto.GenerateRandomPassword(6)
	if err != nil {
		return "", err
	}
	enc, iv, err := uc.cipher.Encrypt(plain)
	if err != nil {
		return "", err
	}
	cred := &schedDomain.ParticipantCredential{
		NISN:        nisn,
		Username:    nisn,
		PasswordEnc: enc,
		PasswordIV:  iv,
		IsActive:    true,
		GeneratedBy: "system",
	}
	if err := uc.credDB.Upsert(ctx, cred); err != nil {
		return "", err
	}
	return plain, nil
}

var _ = time.Now // future use
