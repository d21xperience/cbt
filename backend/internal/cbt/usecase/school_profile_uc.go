// internal/cbt/usecase/school_profile_uc.go
// BCR-2: Business logic School Profile.
package usecase

import (
	"context"
	"strings"

	"cbt-engine-service/internal/cbt/domain"
	cbtRepo "cbt-engine-service/internal/cbt/repository/sqlite"
)

// Batas panjang string logo (base64 data URL) — konsisten dengan mock.
const logoMaxLength = 2 * 1024 * 1024 // 2 MB text

// SchoolProfileUseCase — orchestrate profile get/update.
type SchoolProfileUseCase struct {
	db *cbtRepo.SchoolProfileDB
}

func NewSchoolProfileUseCase(db *cbtRepo.SchoolProfileDB) *SchoolProfileUseCase {
	return &SchoolProfileUseCase{db: db}
}

// Get — return singleton profile (auto-init jika belum ada).
func (uc *SchoolProfileUseCase) Get(ctx context.Context) (*domain.SchoolProfile, error) {
	return uc.db.Get(ctx)
}

// Update — validate & upsert extension fields.
// Identity (nama_sekolah/npsn/jenjang) TIDAK diterima di sini (domain tak punya field-nya).
func (uc *SchoolProfileUseCase) Update(ctx context.Context, p *domain.SchoolProfile) error {
	// Validasi logo — konsisten dengan mock schoolProfileHandlers.js
	if p.LogoURL != "" {
		if !strings.HasPrefix(p.LogoURL, "data:image/") {
			return domain.ErrSchoolProfileLogoInvalid
		}
		if len(p.LogoURL) > logoMaxLength {
			return domain.ErrSchoolProfileLogoTooLarge
		}
	}
	return uc.db.Upsert(ctx, p)
}
