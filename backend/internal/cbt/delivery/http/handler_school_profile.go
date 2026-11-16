// internal/cbt/delivery/http/handler_school_profile.go
// BCR-2: Handler Profil Sekolah — extension only (identity dari tenants).
// Mock contract: GET merged, PUT **partial merge** (whitelist extension).
package http

import (
	"encoding/json"
	"log"

	"cbt-engine-service/internal/cbt/domain"
	"cbt-engine-service/internal/tenant"

	"github.com/gofiber/fiber/v2"
)

// HandleGetSchoolProfile — GET /admin/school-profile
// Return MERGED: identity (tenant context) + extension (tenant.db).
func (h *CBTHandler) HandleGetSchoolProfile(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	ext, err := uc.SchoolProfileUC.Get(c.Context())
	if err != nil {
		log.Printf("[Handler] GetSchoolProfile: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
	}

	return c.JSON(fiber.Map{
		"status": "ok",
		"data":   mergeProfileIdentity(c, ext),
	})
}

// HandleUpdateSchoolProfile — PUT /admin/school-profile
// **Partial merge**: hanya field yang dikirim di body yang di-update.
// Sesuai mock schoolProfileHandlers.js: `{ ...current, ...extensionPatch }`.
func (h *CBTHandler) HandleUpdateSchoolProfile(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	// 1. Ambil existing (basis merge)
	existing, err := uc.SchoolProfileUC.Get(c.Context())
	if err != nil {
		log.Printf("[Handler] UpdateSchoolProfile get-existing: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
	}

	// 2. Parse body sebagai map → deteksi field yang benar-benar dikirim
	var rawMap map[string]json.RawMessage
	if err := json.Unmarshal(c.Body(), &rawMap); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_json"})
	}

	// 3. Merge: hanya override field yang ada di body
	patch := *existing
	apply := func(key string, target *string) {
		v, ok := rawMap[key]
		if !ok {
			return
		}
		var s string
		if json.Unmarshal(v, &s) == nil {
			*target = s
		}
	}
	apply("nss", &patch.NSS)
	apply("kode_sekolah", &patch.KodeSekolah)
	apply("alamat_jalan", &patch.AlamatJalan)
	apply("alamat_desa", &patch.AlamatDesa)
	apply("alamat_kecamatan", &patch.AlamatKecamatan)
	apply("alamat_kabupaten", &patch.AlamatKabupaten)
	apply("alamat_provinsi", &patch.AlamatProvinsi)
	apply("alamat_kode_pos", &patch.AlamatKodePos)
	apply("telp", &patch.Telp)
	apply("email", &patch.Email)
	apply("website", &patch.Website)
	apply("kepala_sekolah_nama", &patch.KepalaSekolahNama)
	apply("kepala_sekolah_nip", &patch.KepalaSekolahNIP)
	apply("logo_url", &patch.LogoURL)

	// 4. Validasi + upsert (full-row, tapi semua field sudah terisi dari merge)
	if err := uc.SchoolProfileUC.Update(c.Context(), &patch); err != nil {
		switch err {
		case domain.ErrSchoolProfileLogoInvalid:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "invalid_logo",
				"message": "Logo harus berupa data URL (base64).",
			})
		case domain.ErrSchoolProfileLogoTooLarge:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "logo_too_large",
				"message": "Ukuran logo terlalu besar (max 1 MB).",
			})
		default:
			log.Printf("[Handler] UpdateSchoolProfile: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
		}
	}

	// 5. Return merged fresh dari DB
	fresh, _ := uc.SchoolProfileUC.Get(c.Context())
	return c.JSON(fiber.Map{
		"status":  "ok",
		"message": "Profil sekolah berhasil disimpan.",
		"data":    mergeProfileIdentity(c, fresh),
	})
}

// mergeProfileIdentity — gabungkan identity (tenant context, read-only) + extension.
func mergeProfileIdentity(c *fiber.Ctx, ext *domain.SchoolProfile) fiber.Map {
	out := fiber.Map{
		// Extension fields (editable)
		"nss":                 ext.NSS,
		"kode_sekolah":        ext.KodeSekolah,
		"alamat_jalan":        ext.AlamatJalan,
		"alamat_desa":         ext.AlamatDesa,
		"alamat_kecamatan":    ext.AlamatKecamatan,
		"alamat_kabupaten":    ext.AlamatKabupaten,
		"alamat_provinsi":     ext.AlamatProvinsi,
		"alamat_kode_pos":     ext.AlamatKodePos,
		"telp":                ext.Telp,
		"email":               ext.Email,
		"website":             ext.Website,
		"kepala_sekolah_nama": ext.KepalaSekolahNama,
		"kepala_sekolah_nip":  ext.KepalaSekolahNIP,
		"logo_url":            ext.LogoURL,
		"updated_at":          ext.UpdatedAt,
	}

	// Identity fields (read-only, dari tenant middleware context)
	if info := tenant.FromContext(c.UserContext()); info != nil {
		out["subdomain"] = info.Subdomain
		out["nama_sekolah"] = info.SchoolName
		out["npsn"] = info.NPSN
		out["jenjang"] = info.Jenjang
	}

	return out
}
