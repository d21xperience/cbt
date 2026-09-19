package http

import (
	"errors"
	"fmt"
	"log"

	platformDomain "cbt-engine-service/internal/platform/domain"
	platformUC "cbt-engine-service/internal/platform/usecase"

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

	// Sanitize output — only safe fields
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

	// ApproveSchool returns temp password
	tempPassword, err := h.tenantUC.ApproveSchool(c.Context(), tenantID, actorID)
	if err != nil {
		return respondOnboardingError(c, err)
	}

	// Fetch tenant for subdomain + admin username info
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
