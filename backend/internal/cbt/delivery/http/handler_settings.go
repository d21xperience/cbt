package http

import (
	"database/sql"
	"encoding/json"

	"github.com/gofiber/fiber/v2"
)

type PrintPreferences struct {
	PaperSize    string  `json:"paper_size"`
	Orientation  string  `json:"orientation"`
	MarginTop    int     `json:"margin_top"`
	MarginRight  int     `json:"margin_right"`
	MarginBottom int     `json:"margin_bottom"`
	MarginLeft   int     `json:"margin_left"`
	CardWidth    float64 `json:"card_width"`  // dalam mm
	CardHeight   float64 `json:"card_height"` // dalam mm
	CenterCards  bool    `json:"center_cards"`
}

func (h *CBTHandler) HandleGetPrintPreferences(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	value, err := uc.ParticipantUC.GetSetting(c.Context(), "print_preferences")

	if err == sql.ErrNoRows {
		// Return default jika belum ada
		defaultPrefs := PrintPreferences{
			PaperSize: "A4", Orientation: "portrait",
			MarginTop: 20, MarginRight: 20, MarginBottom: 40, MarginLeft: 20,
			CardWidth: 85.6, CardHeight: 53.98, CenterCards: true, // Default ID-1 (ATM/KTP)
		}
		return c.JSON(fiber.Map{"status": "ok", "data": defaultPrefs})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal mengambil preferensi"})
	}

	var prefs PrintPreferences
	if err := json.Unmarshal([]byte(value), &prefs); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "format preferensi rusak"})
	}

	return c.JSON(fiber.Map{"status": "ok", "data": prefs})
}

func (h *CBTHandler) HandleUpdatePrintPreferences(c *fiber.Ctx) error {
	var prefs PrintPreferences
	if err := c.BodyParser(&prefs); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_json"})
	}

	jsonValue, _ := json.Marshal(prefs)

	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	err = uc.ParticipantUC.SetSetting(c.Context(), "print_preferences", string(jsonValue))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal menyimpan preferensi"})
	}

	return c.JSON(fiber.Map{"status": "ok", "message": "Preferensi cetak berhasil disimpan"})
}
