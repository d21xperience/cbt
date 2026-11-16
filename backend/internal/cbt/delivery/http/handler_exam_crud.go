package http

import (
	"cbt-engine-service/internal/cbt/domain"
	"github.com/gofiber/fiber/v2"
)

func (h *CBTHandler) HandleListExams(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "error": "tenant_db_unavailable"})
	}
	periodID := c.Query("academic_period_id")
	list, err := uc.ExamUC.List(c.Context(), periodID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "error": "internal_error"})
	}
	return c.JSON(fiber.Map{"status": "ok", "data": list, "count": len(list)})
}

func (h *CBTHandler) HandleFindOrCreateExam(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "error": "tenant_db_unavailable"})
	}
	var req domain.Exam
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "error": "invalid_body"})
	}
	if req.SubjectID == "" || req.ClassID == "" || req.JenisUjianID == "" || req.AcademicPeriodID == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "error": "validation_failed", "message": "subject_id, class_id, jenis_ujian_id, academic_period_id wajib"})
	}
	if req.DurationMinutes == 0 {
		req.DurationMinutes = 90 // default
	}
	res, err := uc.ExamUC.FindOrCreate(c.Context(), req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "ok", "data": res})
}

func (h *CBTHandler) HandleDeleteExam(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "error": "tenant_db_unavailable"})
	}
	id := c.Params("id")
	if err := uc.ExamUC.Delete(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}
