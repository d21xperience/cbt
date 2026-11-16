package http

import (
	"cbt-engine-service/internal/cbt/domain"
	"log"

	"github.com/gofiber/fiber/v2"
)

func (h *CBTHandler) HandleListAcademicPeriods(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	list, _ := uc.AcademicPeriodUC.List(c.Context())
	if list == nil {
		list = []domain.AcademicPeriod{}
	}
	return c.JSON(fiber.Map{"status": "ok", "data": list, "count": len(list)})
}

func (h *CBTHandler) HandleCreateAcademicPeriod(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	var req struct {
		AcademicYear string `json:"academic_year"`
		Semester     string `json:"semester"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}

	result, err := uc.AcademicPeriodUC.CreateWithRollover(c.Context(), req.AcademicYear, req.Semester)
	if err != nil {
		if err == domain.ErrAcademicPeriodExist {
			return c.Status(409).JSON(fiber.Map{
				"error":   "period_exists",
				"message": "Tahun ajaran tersebut sudah ada",
			})
		}
		log.Printf("[Handler] CreateAcademicPeriod: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(fiber.Map{
		"status":  "ok",
		"message": "Tahun ajaran berhasil dibuat",
		"data":    result,
	})
}

func (h *CBTHandler) HandleActivateAcademicPeriod(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "id wajib"})
	}
	if err := uc.AcademicPeriodUC.Activate(c.Context(), id); err != nil {
		if err == domain.ErrAcademicPeriodNotFound {
			return c.Status(404).JSON(fiber.Map{"error": "period_not_found"})
		}
		log.Printf("[Handler] ActivateAcademicPeriod: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}
	return c.JSON(fiber.Map{"status": "ok", "message": "Periode berhasil diaktifkan"})
}
