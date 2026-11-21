package http

import (
	"cbt-engine-service/internal/cbt/domain"
	"cbt-engine-service/internal/tenant"
	"strings"

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
	// Resolve tenant dari context (resolver) — JANGAN hardcode 'default'.
	tenantID := ""
	if info := tenant.FromContext(c.UserContext()); info != nil {
		tenantID = info.TenantID
	}
	if tenantID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status": "error",
			"error":  "tenant_not_resolved",
		})
	}

	if err := uc.ParticipantUC.ToggleExamMode(c.UserContext(), req.Mode, students, tenantID); err != nil {
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

// HandleRevokeCard — Cabut kartu berdasarkan NIS (username)
func (h *CBTHandler) HandleRevokeCard(c *fiber.Ctx) error {
	nis := c.Params("nis")
	if nis == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "NIS diperlukan"})
	}

	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	err = uc.ParticipantUC.RevokeCard(c.Context(), nis)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal mencabut kartu"})
	}

	return c.JSON(fiber.Map{"status": "ok", "message": "Kartu berhasil dicabut"})
}

// HandleResetDevice — Reset device binding berdasarkan NIS (username)
func (h *CBTHandler) HandleResetDevice(c *fiber.Ctx) error {
	nis := c.Params("nis")
	if nis == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "NIS diperlukan"})
	}

	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	_, err = uc.ParticipantUC.ResetDevice(c.Context(), nis)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal reset device"})
	}

	return c.JSON(fiber.Map{"status": "ok", "message": "Device binding berhasil direset"})
}

// HandleGenerateQrToken — Generate QR token baru untuk NIS tertentu
func (h *CBTHandler) HandleGenerateQrToken(c *fiber.Ctx) error {
	nis := c.Params("nis")
	if nis == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "NIS diperlukan"})
	}

	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	newToken, err := uc.ParticipantUC.GenerateQrToken(c.Context(), nis)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal generate QR token"})
	}

	return c.JSON(fiber.Map{
		"status":   "ok",
		"message":  "QR token berhasil dibuat",
		"qr_token": newToken,
	})
}

// HandleQrLogin — login peserta via QR token (kartu ujian).
// Meniru pola response HandleLogin agar frontend AuthService.qrLogin kompatibel.
func (h *CBTHandler) HandleQrLogin(c *fiber.Ctx) error {
	var req struct {
		Token string `json:"token"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if strings.TrimSpace(req.Token) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Token QR wajib diisi"})
	}

	// Resolve tenant (sama seperti HandleLogin)
	info := tenant.FromContext(c.UserContext())
	if info == nil || info.TenantID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "tenant_not_resolved",
			"message": "Akses melalui subdomain tenant atau X-Tenant-Slug",
		})
	}

	if h.factory == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "factory_unavailable"})
	}
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		log.Printf("[Handler] factory.Usecases (qr-login): %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	siswa, jwtToken, err := uc.ParticipantUC.LoginByQrToken(c.Context(), strings.TrimSpace(req.Token), info.TenantID)
	if err != nil {
		// Pesan dari usecase sudah informatif: "token QR tidak valid..." / "kartu ini telah dicabut"
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	tenantSlug := info.Subdomain
	if tenantSlug == "" {
		tenantSlug = "default"
	}

	// D.2: Ambil Exam Mode untuk response (konsisten dengan HandleLogin)
	examMode := ""
	if mode, mErr := uc.ParticipantUC.GetExamMode(c.Context()); mErr == nil {
		examMode = mode
	}

	// Response IDENTIK dengan HandleLogin (kecuali eligible_exams tetap disertakan)
	return c.JSON(fiber.Map{
		"role":  "PARTICIPANT",
		"token": jwtToken,
		"user": fiber.Map{
			"id":     siswa.ID,
			"name":   siswa.Nama,
			"nis":    siswa.NIS,
			"nisn":   siswa.NISN,
			"class":  siswa.KelasNama,
			"tenant": tenantSlug,
		},
		"exam_mode":      examMode,
		"eligible_exams": []string{},
	})
}
