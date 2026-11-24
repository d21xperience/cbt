package http

import (
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"

	platformDomain "cbt-engine-service/internal/platform/domain"
	platformUC "cbt-engine-service/internal/platform/usecase"
	schedulingUsecase "cbt-engine-service/internal/scheduling/usecase"

	"github.com/gofiber/fiber/v2"
)

// ============================================
// BE-P1: Public registration + Super Admin approval
// ============================================

// HandlePublicRegisterSchool — POST /public/schools/register
// Auth: NONE. Rate limit: 5/hour per IP.
func (h *CBTHandler) HandlePublicRegisterSchool(c *fiber.Ctx) error {
	if h.tenantUC == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "service_unavailable",
		})
	}

	var req platformDomain.RegisterSchoolRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid_body",
		})
	}

	t, err := h.tenantUC.RegisterSchool(c.Context(), req)
	if err != nil {
		return respondOnboardingError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"status":  "pending",
		"message": "Registration pending approval",
		"data": fiber.Map{
			"tenant_id": t.TenantID,
			"subdomain": t.Subdomain,
		},
	})
}

// ============================================
// NEW (FASE 2): SuperAdmin direct register
// ============================================

// HandleSuperRegisterSchool — POST /super/schools/register
// Auth: SUPER_ADMIN
// Langsung provision (status ACTIVE) + return temp_password.
func (h *CBTHandler) HandleSuperRegisterSchool(c *fiber.Ctx) error {
	if h.tenantUC == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "service_unavailable",
		})
	}

	var req platformDomain.SuperRegisterSchoolRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "invalid_body",
			"message": err.Error(),
		})
	}

	actorID, _ := c.Locals("userID").(string)
	if actorID == "" {
		actorID = "system"
	}

	t, tempPassword, err := h.tenantUC.SuperRegisterSchool(c.Context(), req, actorID)
	if err != nil {
		return respondOnboardingError(c, err)
	}

	loginURL := fmt.Sprintf("https://%s.ujian.pw/#/auth/admin", t.Subdomain)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"status":  "ok",
		"message": "School registered and activated",
		"data": fiber.Map{
			"tenant_id":        t.TenantID,
			"subdomain":        t.Subdomain,
			"school_name":      t.SchoolName,
			"admin_username":   t.PendingAdminUsername,
			"temp_password":    tempPassword,
			"login_url":        loginURL,
			"package_tier":     t.PackageTier,
			"billing_type":     t.BillingType,
			"max_participants": t.MaxParticipants,
			"note":             "Simpan password ini. Wajib diganti setelah login pertama.",
		},
	})
}

// ============================================
// NEW (FASE 2): UpdateSchool
// ============================================

// HandleSuperUpdateSchool — PUT /super/schools/:tenant_id
// Auth: SUPER_ADMIN
func (h *CBTHandler) HandleSuperUpdateSchool(c *fiber.Ctx) error {
	if h.tenantUC == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "service_unavailable",
		})
	}

	tenantID := c.Params("tenant_id")
	if tenantID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "tenant_id_wajib",
		})
	}

	var req platformDomain.UpdateSchoolRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "invalid_body",
			"message": err.Error(),
		})
	}

	actorID, _ := c.Locals("userID").(string)
	if actorID == "" {
		actorID = "system"
	}

	if err := h.tenantUC.UpdateSchool(c.Context(), tenantID, &req, actorID); err != nil {
		return respondOnboardingError(c, err)
	}

	// Return updated tenant
	t, _ := h.tenantUC.GetTenant(c.Context(), tenantID)
	return c.JSON(fiber.Map{
		"status":  "ok",
		"message": "School updated",
		"data":    tenantToMap(t),
	})
}

// ============================================
// NEW (FASE 2): Suspend / Unsuspend / SyncLock
// ============================================

// HandleSuperSuspendSchool — POST /super/schools/:tenant_id/suspend
// Auth: SUPER_ADMIN
func (h *CBTHandler) HandleSuperSuspendSchool(c *fiber.Ctx) error {
	if h.tenantUC == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "service_unavailable",
		})
	}

	tenantID := c.Params("tenant_id")
	if tenantID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "tenant_id_wajib"})
	}

	var req platformDomain.SuspendSchoolRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid_body",
		})
	}

	actorID, _ := c.Locals("userID").(string)
	if actorID == "" {
		actorID = "system"
	}

	if err := h.tenantUC.SuspendSchool(c.Context(), tenantID, req.Reason, actorID); err != nil {
		return respondOnboardingError(c, err)
	}

	return c.JSON(fiber.Map{
		"status":  "ok",
		"message": "Tenant suspended",
		"data": fiber.Map{
			"tenant_id":    tenantID,
			"is_suspended": true,
			"reason":       req.Reason,
		},
	})
}

// HandleSuperUnsuspendSchool — POST /super/schools/:tenant_id/unsuspend
// Auth: SUPER_ADMIN
func (h *CBTHandler) HandleSuperUnsuspendSchool(c *fiber.Ctx) error {
	if h.tenantUC == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "service_unavailable",
		})
	}

	tenantID := c.Params("tenant_id")
	if tenantID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "tenant_id_wajib"})
	}

	var req platformDomain.UnsuspendSchoolRequest
	_ = c.BodyParser(&req) // body opsional

	actorID, _ := c.Locals("userID").(string)
	if actorID == "" {
		actorID = "system"
	}

	if err := h.tenantUC.UnsuspendSchool(c.Context(), tenantID, req.Note, actorID); err != nil {
		return respondOnboardingError(c, err)
	}

	return c.JSON(fiber.Map{
		"status":  "ok",
		"message": "Tenant unsuspended",
		"data": fiber.Map{
			"tenant_id":    tenantID,
			"is_suspended": false,
		},
	})
}

// HandleSuperSetSyncLock — POST /super/schools/:tenant_id/sync-lock
// Auth: SUPER_ADMIN
func (h *CBTHandler) HandleSuperSetSyncLock(c *fiber.Ctx) error {
	if h.tenantUC == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "service_unavailable",
		})
	}

	tenantID := c.Params("tenant_id")
	if tenantID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "tenant_id_wajib"})
	}

	var req platformDomain.SetSyncLockRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid_body",
		})
	}

	actorID, _ := c.Locals("userID").(string)
	if actorID == "" {
		actorID = "system"
	}

	if err := h.tenantUC.SetSyncLock(c.Context(), tenantID, req.Locked, actorID); err != nil {
		return respondOnboardingError(c, err)
	}

	return c.JSON(fiber.Map{
		"status":  "ok",
		"message": "Sync lock updated",
		"data": fiber.Map{
			"tenant_id":   tenantID,
			"sync_locked": req.Locked,
		},
	})
}

// ============================================
// Existing: pending / approve / reject
// ============================================

// HandleListPendingSchools — GET /super/schools/pending
// Auth: SUPER_ADMIN
func (h *CBTHandler) HandleListPendingSchools(c *fiber.Ctx) error {
	if h.tenantUC == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "service_unavailable",
		})
	}

	list, err := h.tenantUC.ListPendingSchools(c.Context())
	if err != nil {
		log.Printf("[Handler] ListPendingSchools: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "internal_error",
		})
	}

	data := make([]fiber.Map, 0, len(list))
	for _, t := range list {
		data = append(data, fiber.Map{
			"tenant_id":     t.TenantID,
			"npsn":          t.NPSN,
			"school_name":   t.SchoolName,
			"subdomain":     t.Subdomain,
			"contact_email": t.ContactEmail,
			"contact_phone": t.ContactPhone,
			"created_at":    t.CreatedAt,
		})
	}
	return c.JSON(fiber.Map{"status": "ok", "data": data, "count": len(data)})
}

func (h *CBTHandler) HandleApproveSchool(c *fiber.Ctx) error {
	if h.tenantUC == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "service_unavailable",
		})
	}

	tenantID := c.Params("tenant_id")
	if tenantID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "tenant_id_wajib",
		})
	}

	actorID, _ := c.Locals("userID").(string)
	if actorID == "" {
		actorID = "system"
	}

	tempPassword, err := h.tenantUC.ApproveSchool(c.Context(), tenantID, actorID)
	if err != nil {
		return respondOnboardingError(c, err)
	}

	t, _ := h.tenantUC.GetTenant(c.Context(), tenantID)
	subdomain := ""
	adminUsername := "admin"
	if t != nil {
		subdomain = t.Subdomain
		if t.PendingAdminUsername != "" {
			adminUsername = t.PendingAdminUsername
		}
	}

	return c.JSON(fiber.Map{
		"status":  "ok",
		"message": "School provisioned and activated",
		"data": fiber.Map{
			"tenant_id":      tenantID,
			"subdomain":      subdomain,
			"admin_username": adminUsername,
			"temp_password":  tempPassword,
			"login_url":      fmt.Sprintf("https://%s.ujian.pw/#/auth/admin", subdomain),
			"note":           "Simpan password ini. Wajib diganti setelah login pertama.",
		},
	})
}

// HandleRejectSchool — POST /super/schools/:tenant_id/reject
// Auth: SUPER_ADMIN
func (h *CBTHandler) HandleRejectSchool(c *fiber.Ctx) error {
	if h.tenantUC == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "service_unavailable",
		})
	}

	tenantID := c.Params("tenant_id")
	var body struct {
		Reason string `json:"reason"`
	}
	_ = c.BodyParser(&body)

	actorID, _ := c.Locals("userID").(string)
	if actorID == "" {
		actorID = "system"
	}

	if err := h.tenantUC.RejectSchool(c.Context(), tenantID, actorID, body.Reason); err != nil {
		return respondOnboardingError(c, err)
	}

	return c.JSON(fiber.Map{
		"status":  "ok",
		"message": "School rejected",
	})
}

// ============================================
// BE-P2: Public school list
// ============================================

// HandleListPublicSchools — GET /public/schools
// Auth: NONE. Rate limit: 60/min per IP.
func (h *CBTHandler) HandleListPublicSchools(c *fiber.Ctx) error {
	if h.tenantUC == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "service_unavailable",
		})
	}

	list, err := h.tenantUC.ListActivePublic(c.Context())
	if err != nil {
		log.Printf("[Handler] ListActivePublic: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "internal_error",
		})
	}

	return c.JSON(fiber.Map{
		"status": "ok",
		"data":   list,
		"count":  len(list),
	})
}

// ============================================
// NEW (FASE 2): Helper tenant → fiber.Map
// ============================================

// tenantToMap — serialize Tenant ke bentuk yang konsisten dengan HandleListSchools.
func tenantToMap(t *platformDomain.Tenant) fiber.Map {
	if t == nil {
		return nil
	}
	return fiber.Map{
		"id":                     t.TenantID, // alias agar frontend `s.id` jalan
		"tenant_id":              t.TenantID,
		"npsn":                   t.NPSN,
		"slug":                   t.Subdomain,
		"subdomain":              t.Subdomain,
		"name":                   t.SchoolName,
		"school_name":            t.SchoolName,
		"contact_email":          t.ContactEmail,
		"contact_phone":          t.ContactPhone,
		"jenjang":                t.Jenjang,
		"program_duration_years": t.ProgramDurationYears,
		"status":                 t.Status,
		"is_active":              t.IsActive && !t.IsSuspended,
		"is_suspended":           t.IsSuspended,
		"suspended_reason":       t.SuspendReason,
		"package_tier":           t.PackageTier,
		"billing_type":           t.BillingType,
		"max_participants":       t.MaxParticipants,
		"sync_locked":            t.SyncLocked,
		"logo_url":               t.LogoURL,
		"created_at":             t.CreatedAt,
		"updated_at":             t.UpdatedAt,
	}
}

// ============================================
// Error mapping
// ============================================

func respondOnboardingError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, platformUC.ErrInvalidFormat):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "INVALID_FORMAT",
			"message": err.Error(),
		})
	case errors.Is(err, platformUC.ErrNPSNExists):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "NPSN_ALREADY_EXISTS",
			"message": "NPSN sudah terdaftar",
		})
	case errors.Is(err, platformUC.ErrSubdomainExists):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "SUBDOMAIN_ALREADY_EXISTS",
			"message": "Subdomain sudah digunakan",
		})
	case errors.Is(err, platformUC.ErrTenantNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":   "tenant_not_found",
			"message": "Tenant tidak ditemukan",
		})
	case errors.Is(err, platformUC.ErrTenantNotPending):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":   "tenant_not_pending",
			"message": "Tenant tidak dalam status PENDING",
		})
	case errors.Is(err, platformUC.ErrProvisioningFailed):
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "PROVISIONING_FAILED",
			"message": err.Error(),
		})
	default:
		log.Printf("[Handler] Onboarding error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "internal_error",
			"message": err.Error(),
		})
	}
}

// ============================================
// FASE 3: Admin Management (Platform DB)
// ============================================

// HandleSuperListAdmins — GET /super/schools/:tenant_id/admins
// Auth: SUPER_ADMIN
func (h *CBTHandler) HandleSuperListAdmins(c *fiber.Ctx) error {
	if h.tenantUC == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "service_unavailable",
		})
	}

	tenantID := c.Params("tenant_id")
	if tenantID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "tenant_id_wajib"})
	}

	t, err := h.tenantUC.GetTenant(c.Context(), tenantID)
	if err != nil || t == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "tenant_not_found"})
	}

	// Ambil dari platform DB
	if h.platformAdminDB == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "platform_admin_db_unavailable",
		})
	}

	list, err := h.platformAdminDB.ListByTenant(c.Context(), t.Subdomain)
	if err != nil {
		log.Printf("[Handler] ListAdmins failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
	}

	data := make([]fiber.Map, 0, len(list))
	for _, a := range list {
		data = append(data, fiber.Map{
			"admin_id":  a.ID,
			"tenant_id": a.TenantID,
			"username":  a.Username,
			"role":      a.Role,
			"is_active": a.IsActive,
		})
	}

	return c.JSON(fiber.Map{"status": "ok", "data": data, "count": len(data)})
}

// HandleSuperResetAdminPassword — POST /super/schools/:tenant_id/admin/reset-password
// Auth: SUPER_ADMIN
// Body: { "new_password": "..." } — jika kosong, generate temp password.
func (h *CBTHandler) HandleSuperResetAdminPassword(c *fiber.Ctx) error {
	if h.tenantUC == nil || h.platformAdminDB == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "service_unavailable",
		})
	}

	tenantID := c.Params("tenant_id")
	if tenantID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "tenant_id_wajib"})
	}

	var body struct {
		Username    string `json:"username"`
		NewPassword string `json:"new_password,omitempty"`
	}
	_ = c.BodyParser(&body)

	if body.Username == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "username_wajib"})
	}

	t, err := h.tenantUC.GetTenant(c.Context(), tenantID)
	if err != nil || t == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "tenant_not_found"})
	}

	// Generate temp password jika kosong
	newPassword := body.NewPassword
	generated := false
	if newPassword == "" {
		var genErr error
		newPassword, genErr = generateTempPasswordHelper(12)
		if genErr != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "generate_failed"})
		}
		generated = true
	}

	hash, err := hashPasswordHelper(newPassword)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "hash_failed"})
	}

	if err := h.platformAdminDB.ResetPassword(c.Context(), tenantID, body.Username, hash); err != nil {
		log.Printf("[Handler] ResetPassword failed: %v", err)
		return respondOnboardingError(c, platformUC.ErrTenantNotFound)
	}

	return c.JSON(fiber.Map{
		"status":  "ok",
		"message": "Password admin berhasil direset",
		"data": fiber.Map{
			"tenant_id":     tenantID,
			"subdomain":     t.Subdomain,
			"username":      body.Username,
			"temp_password": newPassword,
			"generated":     generated,
			"note":          "Simpan password ini. Wajib diganti setelah login.",
		},
	})
}

// generateTempPasswordHelper — wrapper untuk usecase.generateTempPassword.
func generateTempPasswordHelper(length int) (string, error) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
	out := make([]byte, length)
	for i := range out {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphabet))))
		if err != nil {
			return "", err
		}
		out[i] = alphabet[n.Int64()]
	}
	return string(out), nil
}

// hashPasswordHelper — wrapper untuk usecase.HashPassword.
func hashPasswordHelper(plain string) (string, error) {
	return schedulingUsecase.HashPassword(plain)
}
