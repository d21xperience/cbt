package http

import (
	"cbt-engine-service/internal/cbt/domain"
	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

// HandleToggleExamMode — POST /admin/exam-mode
func (h *CBTHandler) HandleToggleExamMode(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	var req struct {
		Mode string `json:"mode"` // "UTS", "UAS", atau "" untuk mematikan
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"status": "error", "error": "invalid_body"})
	}

	// Ambil period ID aktif dari context (jika ada) atau query
	periodID, _ := c.Locals("academic_period_id").(string)
	if periodID == "" {
		periodID = c.Query("period_id")
	}
	if periodID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"status": "error", "error": "period_id_required"})
	}

	// 1. Ambil list siswa (untuk digenerate password jika mode nyala)
	filter := domain.SiswaFilter{Status: "AKTIF"}
	students, err := uc.SiswaUC.List(c.UserContext(), filter)
	if err != nil {
		log.Error().Err(err).Msg("[Handler] HandleToggleExamMode - List Students")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"status": "error", "error": "failed_fetch_students"})
	}

	// 2. Jalankan transaksi reset & save mode
	if err := uc.ParticipantUC.ToggleExamMode(c.UserContext(), req.Mode, students); err != nil {
		log.Error().Err(err).Msg("[Handler] HandleToggleExamMode - Toggle")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"status": "error", "error": "failed_toggle_mode", "detail": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status":  "ok",
		"message": "Mode Ujian berhasil diperbarui dan data peserta di-reset.",
	})
}

// HandleGetExamCards — GET /admin/cards
func (h *CBTHandler) HandleGetExamCards(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	classID := c.Query("class_id")
	search := c.Query("search")

	cards, err := uc.ParticipantUC.GetExamCards(c.UserContext(), classID, search)
	if err != nil {
		log.Error().Err(err).Msg("[Handler] GetExamCards failed")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed_to_fetch_cards"})
	}

	return c.JSON(fiber.Map{
		"status": "ok",
		"data":   cards,
	})
}

// HandleMarkCardPrinted — Stub endpoint untuk mencatat kartu sudah dicetak (MVP)
func (h *CBTHandler) HandleMarkCardPrinted(c *fiber.Ctx) error {
	// TODO: Phase selanjutnya bisa mencatat audit log pencetakan di sini
	return c.JSON(fiber.Map{"status": "ok", "message": "Card marked as printed"})
}
