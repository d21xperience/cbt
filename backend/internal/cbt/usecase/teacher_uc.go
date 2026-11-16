package usecase

import (
	"cbt-engine-service/internal/cbt/domain"
	"cbt-engine-service/internal/cbt/repository/sqlite"
	"cbt-engine-service/internal/crypto"
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"log"
	"math/big"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type TeacherUseCase struct {
	repo   *sqlite.TeacherDB
	cipher *crypto.Cipher
}

func NewTeacherUseCase(r *sqlite.TeacherDB, cipher *crypto.Cipher) *TeacherUseCase {
	return &TeacherUseCase{repo: r, cipher: cipher}
}

func (uc *TeacherUseCase) List(ctx context.Context) ([]domain.Teacher, error) {
	list, err := uc.repo.List(ctx)
	if err != nil {
		return nil, err
	}
	for i := range list {
		uc.attachPassword(&list[i])
	}
	return list, nil
}

// attachPassword — decrypt ciphertext → set Password (response only). Fail-safe:
// kalau enc/iv kosong (belum backfill) atau decrypt error, Password = "".
func (uc *TeacherUseCase) attachPassword(t *domain.Teacher) {
	if len(t.PasswordEnc) == 0 || len(t.PasswordIV) == 0 || uc.cipher == nil {
		t.Password = ""
		return
	}
	plain, err := uc.cipher.Decrypt(t.PasswordEnc, t.PasswordIV)
	if err != nil {
		log.Printf("[TeacherUC.attachPassword] decrypt id=%s: %v", t.ID, err)
		t.Password = ""
		return
	}
	t.Password = plain
}

func (uc *TeacherUseCase) generateCredential(nama string) (string, string, error) {
	base := strings.ToLower(strings.TrimSpace(nama))
	base = strings.ReplaceAll(base, " ", ".")
	reg := regexp.MustCompile(`[^a-z0-9\.]`)
	base = reg.ReplaceAllString(base, "")
	if base == "" {
		base = "guru"
	}

	username := base
	for {
		exists, _ := uc.repo.ExistsUsername(context.Background(), username)
		if !exists {
			break
		}
		n, _ := rand.Int(rand.Reader, big.NewInt(999))
		username = fmt.Sprintf("%s%d", base, n.Int64())
	}

	b := make([]byte, 4)
	rand.Read(b)
	password := base64.URLEncoding.EncodeToString(b)[:6]

	return username, password, nil
}

func (uc *TeacherUseCase) Create(ctx context.Context, t domain.Teacher) (*domain.Teacher, error) {
	if strings.TrimSpace(t.Nama) == "" {
		return nil, domain.ErrTeacherInvalidInput
	}
	t.ID = uuid.NewString()
	if t.Status == "" {
		t.Status = "AKTIF"
	}

	username, password, _ := uc.generateCredential(t.Nama)
	t.Username = username
	t.Password = password // response only

	if uc.cipher == nil {
		return nil, fmt.Errorf("teacher create: cipher belum di-wire")
	}
	enc, iv, err := uc.cipher.Encrypt(password)
	if err != nil {
		return nil, fmt.Errorf("encrypt teacher password: %w", err)
	}
	t.PasswordEnc = enc
	t.PasswordIV = iv

	hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	t.PasswordHash = string(hash)

	if err := uc.repo.Create(ctx, &t); err != nil {
		return nil, err
	}
	return &t, nil
}

func (uc *TeacherUseCase) Update(ctx context.Context, id string, t domain.Teacher) error {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil || existing == nil {
		return err
	}
	if t.Nama != "" {
		existing.Nama = t.Nama
	}
	if t.NIP != "" {
		existing.NIP = t.NIP
	}
	if t.Email != "" {
		existing.Email = t.Email
	}
	if t.JenisKelamin != "" {
		existing.JenisKelamin = t.JenisKelamin
	}
	if t.Status != "" {
		existing.Status = t.Status
	}
	existing.TeachingSubjectIDs = t.TeachingSubjectIDs
	existing.IsHomeroom = t.IsHomeroom
	existing.HomeroomClassID = t.HomeroomClassID
	existing.HomeroomClassName = t.HomeroomClassName
	return uc.repo.Update(ctx, existing)
}

func (uc *TeacherUseCase) ResetPassword(ctx context.Context, id string) (string, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil || existing == nil {
		return "", err
	}

	_, password, _ := uc.generateCredential(existing.Nama)
	hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	if uc.cipher == nil {
		return "", fmt.Errorf("reset password: cipher belum di-wire")
	}
	enc, iv, err := uc.cipher.Encrypt(password)
	if err != nil {
		return "", fmt.Errorf("encrypt new password: %w", err)
	}

	if err := uc.repo.UpdatePassword(ctx, id, string(hash), enc, iv); err != nil {
		return "", err
	}
	return password, nil
}

func (uc *TeacherUseCase) Delete(ctx context.Context, id string) error {
	return uc.repo.Delete(ctx, id)
}
