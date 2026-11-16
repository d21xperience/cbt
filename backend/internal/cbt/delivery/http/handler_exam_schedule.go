package http

import (
	"cbt-engine-service/internal/cbt/domain"
	"github.com/gofiber/fiber/v2"
)

func (h *CBTHandler) HandleListExamSchedules(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	pid := c.Query("academic_period_id")
	var list []domain.ExamSchedule
	if pid != "" {
		list, _ = uc.ExamScheduleUC.ListByPeriodID(c.Context(), pid)
	} else {
		list, _ = uc.ExamScheduleUC.List(c.Context())
	}
	if list == nil {
		list = []domain.ExamSchedule{}
	}
	return c.JSON(fiber.Map{"status": "ok", "data": list, "count": len(list)})
}

func (h *CBTHandler) HandleCreateExamSchedule(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	var req domain.ExamSchedule
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}

	res, err := uc.ExamScheduleUC.Create(c.Context(), req)
	if err != nil {
		if err == domain.ErrExamScheduleInvalid {
			return c.Status(400).JSON(fiber.Map{"error": "validation_failed"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}
	return c.Status(201).JSON(fiber.Map{"status": "ok", "data": res})
}

func (h *CBTHandler) HandleUpdateExamSchedule(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	var req domain.ExamSchedule
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}

	if err := uc.ExamScheduleUC.Update(c.Context(), c.Params("id"), req); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}

func (h *CBTHandler) HandleDeleteExamSchedule(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	if err := uc.ExamScheduleUC.Delete(c.Context(), c.Params("id")); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}
