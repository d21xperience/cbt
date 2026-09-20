package http

import (
	"log"
	"strings"

	"cbt-engine-service/internal/platform/domain"

	"github.com/gofiber/fiber/v2"
)

// ============================================
// VER-007 Extension — Bidang & Program Keahlian
// ============================================

// HandleListBidangKeahlian — GET /public/references/bidang-keahlian
// Public, no auth.
func (h *CBTHandler) HandleListBidangKeahlian(c *fiber.Ctx) error {
	if h.keahlianDB == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "service_unavailable",
		})
	}

	list, err := h.keahlianDB.ListBidang(c.Context())
	if err != nil {
		log.Printf("[Handler] ListBidang: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
	}

	return c.JSON(fiber.Map{"status": "ok", "data": list, "count": len(list)})
}

// HandleListProgramKeahlian — GET /public/references/program-keahlian
// Query: ?bidang=TI (opsional), ?default=true (opsional)
func (h *CBTHandler) HandleListProgramKeahlian(c *fiber.Ctx) error {
	if h.keahlianDB == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "service_unavailable"})
	}

	bidangID := strings.TrimSpace(c.Query("bidang"))
	onlyDefault := c.Query("default") == "true"

	list, err := h.keahlianDB.ListProgram(c.Context(), bidangID, onlyDefault)
	if err != nil {
		log.Printf("[Handler] ListProgram: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
	}

	return c.JSON(fiber.Map{"status": "ok", "data": list, "count": len(list)})
}

// HandleFindOrCreateProgram — POST /admin/program-keahlian/find-or-create
// Auth: ADMIN
//
// Request: { "kode": "TKP", "nama": "Teknik Kapal Pesiar", "bidang_id": "TI", "deskripsi": "" }
// Response: { "status": "ok", "data": {...}, "created": true|false }
func (h *CBTHandler) HandleFindOrCreateProgram(c *fiber.Ctx) error {
	if h.keahlianDB == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "service_unavailable"})
	}

	var req domain.FindOrCreateProgramRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_body"})
	}
	if req.Kode == "" || req.Nama == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "kode dan nama wajib diisi",
		})
	}

	adminID, _ := c.Locals("userID").(string)
	if adminID == "" {
		adminID = "system"
	}

	program, created, err := h.keahlianDB.FindOrCreateProgram(c.Context(), req, adminID)
	if err != nil {
		log.Printf("[Handler] FindOrCreateProgram: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	status := fiber.StatusOK
	if created {
		status = fiber.StatusCreated
	}

	return c.Status(status).JSON(fiber.Map{
		"status":  "ok",
		"data":    program,
		"created": created,
	})
}

// HandleListTenantPrograms — GET /admin/programs
// Auth: ADMIN — list programs assigned to current tenant
func (h *CBTHandler) HandleListTenantPrograms(c *fiber.Ctx) error {
	if h.keahlianDB == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "service_unavailable"})
	}

	// Ambil tenant info dari context
	tenantID := c.Locals("tenant_id")
	if tenantID == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "tenant_not_resolved",
		})
	}

	tid, _ := tenantID.(string)
	list, err := h.keahlianDB.ListTenantPrograms(c.Context(), tid)
	if err != nil {
		log.Printf("[Handler] ListTenantPrograms: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
	}

	return c.JSON(fiber.Map{"status": "ok", "data": list, "count": len(list)})
}

// HandleAssignTenantProgram — POST /admin/programs/assign
// Request: { "program_id": "prog-tkj" }
func (h *CBTHandler) HandleAssignTenantProgram(c *fiber.Ctx) error {
	if h.keahlianDB == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "service_unavailable"})
	}

	tenantID, _ := c.Locals("tenant_id").(string)
	if tenantID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "tenant_required"})
	}

	var body struct {
		ProgramID string `json:"program_id"`
	}
	if err := c.BodyParser(&body); err != nil || body.ProgramID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "program_id wajib"})
	}

	if err := h.keahlianDB.AssignProgramToTenant(c.Context(), tenantID, body.ProgramID); err != nil {
		log.Printf("[Handler] AssignProgram: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "ok", "message": "Program berhasil di-assign"})
}

// HandleRemoveTenantProgram — POST /admin/programs/remove
func (h *CBTHandler) HandleRemoveTenantProgram(c *fiber.Ctx) error {
	if h.keahlianDB == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "service_unavailable"})
	}

	tenantID, _ := c.Locals("tenant_id").(string)
	var body struct {
		ProgramID string `json:"program_id"`
	}
	if err := c.BodyParser(&body); err != nil || body.ProgramID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "program_id wajib"})
	}

	if err := h.keahlianDB.RemoveProgramFromTenant(c.Context(), tenantID, body.ProgramID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "ok", "message": "Program dihapus dari tenant"})
}
