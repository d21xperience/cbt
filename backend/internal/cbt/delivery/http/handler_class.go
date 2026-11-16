package http

import (
	"encoding/csv"
	"fmt"
	"log"
	"strings"

	"cbt-engine-service/internal/cbt/domain"
	"github.com/gofiber/fiber/v2"
)

func (h *CBTHandler) HandleListClasses(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	pid := c.Query("academic_period_id")
	var list []domain.Class
	if pid != "" {
		list, err = uc.ClassDB.ListByPeriodID(c.Context(), pid)
	} else {
		list, err = uc.ClassUC.List(c.Context())
	}
	if err != nil {
		log.Printf("[Handler] ListClasses: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}

	if list == nil {
		list = []domain.Class{}
	}
	return c.JSON(fiber.Map{"status": "ok", "data": list, "count": len(list)})
}

func (h *CBTHandler) HandleCreateClass(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	var req domain.Class
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}

	res, err := uc.ClassUC.Create(c.Context(), req)
	if err != nil {
		if err == domain.ErrClassInvalid {
			return c.Status(400).JSON(fiber.Map{"error": "invalid_input", "message": "Nama dan Tingkat wajib diisi"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}

	return c.Status(201).JSON(fiber.Map{"status": "ok", "data": res})
}

func (h *CBTHandler) HandleUpdateClass(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	id := c.Params("id")
	var req domain.Class
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}

	res, err := uc.ClassUC.Update(c.Context(), id, req)
	if err != nil {
		if err == domain.ErrClassNotFound {
			return c.Status(404).JSON(fiber.Map{"error": "not_found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}

	return c.JSON(fiber.Map{"status": "ok", "data": res})
}

func (h *CBTHandler) HandleDeleteClass(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	id := c.Params("id")
	if err := uc.ClassUC.Delete(c.Context(), id); err != nil {
		if err == domain.ErrClassNotFound {
			return c.Status(404).JSON(fiber.Map{"error": "not_found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}

	return c.JSON(fiber.Map{"status": "ok"})
}

func (h *CBTHandler) HandleClassesTemplate(c *fiber.Ctx) error {
	csvContent := "nama,tingkat,kurikulum,jenis_rombel\nX RPL 3,10,MERDEKA,REGULER\nXI RPL 1,11,MERDEKA,REGULER\n"
	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", "attachment; filename=template_kelas.csv")
	return c.SendString(csvContent)
}

func (h *CBTHandler) HandleImportClasses(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	isPreview := c.Query("preview") == "true" || c.Query("preview") == "1"

	if isPreview {
		fileHeader, err := c.FormFile("file")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "file tidak ditemukan"})
		}
		file, _ := fileHeader.Open()
		defer file.Close()

		reader := csv.NewReader(file)
		reader.FieldsPerRecord = -1
		records, err := reader.ReadAll()
		if err != nil || len(records) < 2 {
			return c.Status(400).JSON(fiber.Map{"error": "format CSV tidak valid"})
		}

		var preview []fiber.Map
		for i, row := range records[1:] {
			if len(row) < 4 {
				continue
			}
			nama := strings.TrimSpace(row[0])
			tingkatStr := strings.TrimSpace(row[1])
			kurikulum := strings.TrimSpace(row[2])
			jenis := strings.TrimSpace(row[3])

			errMsg := ""
			var tingkat int
			if _, e := fmt.Sscanf(tingkatStr, "%d", &tingkat); e != nil {
				errMsg = "Tingkat harus berupa angka"
			}
			if nama == "" {
				errMsg = "Nama wajib diisi"
			}

			preview = append(preview, fiber.Map{
				"_rowNumber": i + 1, "nama": nama, "tingkat": tingkatStr,
				"kurikulum": kurikulum, "jenis_rombel": jenis, "_error": errMsg,
			})
		}
		return c.JSON(fiber.Map{"status": "ok", "data": preview, "errors": []string{}})
	}

	// Real Import
	var body struct {
		Rows []domain.Class `json:"rows"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}

	count := 0
	for _, r := range body.Rows {
		if r.Nama == "" || r.Tingkat == 0 {
			continue
		}
		_, err := uc.ClassUC.Create(c.Context(), r)
		if err == nil {
			count++
		}
	}
	return c.JSON(fiber.Map{"status": "ok", "imported_count": count})
}
