package http

import (
	"cbt-engine-service/internal/cbt/domain"

	"github.com/gofiber/fiber/v2"
)

func (h *CBTHandler) HandleGetExam(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	exam, err := uc.ExamUC.GetExamByID(c.Context(), c.Params("id"))
	if err != nil || exam == nil {
		return c.Status(404).JSON(fiber.Map{"error": "exam_not_found"})
	}

	return c.JSON(fiber.Map{"status": "ok", "data": exam})
}

func (h *CBTHandler) HandleListQuestions(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	examID := c.Query("exam_id")
	if examID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "exam_id_required"})
	}

	list, err := uc.ExamUC.ListQuestions(c.Context(), examID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}
	if list == nil {
		list = []domain.Question{}
	}

	return c.JSON(fiber.Map{"status": "ok", "data": list, "count": len(list)})
}

func (h *CBTHandler) HandleCreateQuestion(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	var req domain.Question
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json_body"})
	}

	if req.ExamID == "" || req.QuestionText == "" {
		return c.Status(400).JSON(fiber.Map{"error": "validation_failed", "message": "exam_id dan question_text wajib"})
	}

	res, err := uc.ExamUC.CreateQuestion(c.Context(), req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"status": "ok", "data": res})
}

func (h *CBTHandler) HandleUpdateQuestion(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	var req domain.Question
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json_body"})
	}

	res, err := uc.ExamUC.UpdateQuestion(c.Context(), c.Params("id"), req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "ok", "data": res})
}

func (h *CBTHandler) HandleDeleteQuestion(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	if err := uc.ExamUC.DeleteQuestion(c.Context(), c.Params("id")); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}


// HandleGetQuestionByID — endpoint GET /admin/questions/:id untuk editor.

// HandleGetQuestionByID — endpoint GET /admin/questions/:id untuk editor.
func (h *CBTHandler) HandleGetQuestionByID(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "id_required"})
	}
	q, err := uc.ExamUC.GetQuestionByID(c.Context(), id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if q == nil {
		return c.Status(404).JSON(fiber.Map{"error": "question_not_found"})
	}
	return c.JSON(fiber.Map{"status": "ok", "data": q})
}

// HandleDeleteQuestionsByExam — hapus semua soal untuk exam_id tertentu.
func (h *CBTHandler) HandleDeleteQuestionsByExam(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	examID := c.Params("id")
	if examID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "exam_id_required"})
	}
	if err := uc.ExamUC.DeleteQuestionsByExamID(c.Context(), examID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}
