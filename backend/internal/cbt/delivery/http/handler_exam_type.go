package http

import (
	"cbt-engine-service/internal/cbt/domain"
	"encoding/csv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

func (h *CBTHandler) HandleListExamTypes(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	list, _ := uc.ExamTypeUC.List(c.Context())
	if list == nil {
		list = []domain.ExamType{}
	}
	return c.JSON(fiber.Map{"status": "ok", "data": list, "count": len(list)})
}

func (h *CBTHandler) HandleCreateExamType(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	var req domain.ExamType
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}

	res, err := uc.ExamTypeUC.Create(c.Context(), req)
	if err != nil {
		if err == domain.ErrExamTypeInvalid {
			return c.Status(400).JSON(fiber.Map{"error": "validation_failed"})
		}
		if err == domain.ErrExamTypeKodeTaken {
			return c.Status(409).JSON(fiber.Map{"error": "kode_taken"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}
	return c.Status(201).JSON(fiber.Map{"status": "ok", "data": res})
}

func (h *CBTHandler) HandleUpdateExamType(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	var req domain.ExamType
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}

	res, err := uc.ExamTypeUC.Update(c.Context(), c.Params("id"), req)
	if err != nil {
		if err == domain.ErrExamTypeNotFound {
			return c.Status(404).JSON(fiber.Map{"error": "not_found"})
		}
		if err == domain.ErrExamTypeKodeTaken {
			return c.Status(409).JSON(fiber.Map{"error": "kode_taken"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}
	return c.JSON(fiber.Map{"status": "ok", "data": res})
}

func (h *CBTHandler) HandleDeleteExamType(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	if err := uc.ExamTypeUC.Delete(c.Context(), c.Params("id")); err != nil {
		if err == domain.ErrExamTypeNotFound {
			return c.Status(404).JSON(fiber.Map{"error": "not_found"})
		}
		if err == domain.ErrExamTypeInUse {
			return c.Status(409).JSON(fiber.Map{"error": "type_in_use", "message": "Jenis ujian default tidak dapat dihapus"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}

func (h *CBTHandler) HandleExamTypesTemplate(c *fiber.Ctx) error {
	csvContent := "kode,nama,deskripsi\nPTS,Penilaian Tengah Semester,PTS Kurikulum Merdeka\nPAS,Penilaian Akhir Semester,PAS Kurikulum Merdeka\n"
	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", "attachment; filename=template_jenis_ujian.csv")
	return c.SendString(csvContent)
}

func (h *CBTHandler) HandleImportExamTypes(c *fiber.Ctx) error {
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
			if len(row) < 3 {
				continue
			}
			kode := strings.TrimSpace(row[0])
			nama := strings.TrimSpace(row[1])
			errMsg := ""
			if kode == "" || nama == "" {
				errMsg = "Kode dan Nama wajib diisi"
			}

			preview = append(preview, fiber.Map{
				"_rowNumber": i + 1, "kode": kode, "nama": nama, "deskripsi": strings.TrimSpace(row[2]), "_error": errMsg,
			})
		}
		return c.JSON(fiber.Map{"status": "ok", "data": preview, "errors": []string{}})
	}

	var body struct {
		Rows []domain.ExamType `json:"rows"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}

	count := 0
	for _, r := range body.Rows {
		if r.Kode == "" || r.Nama == "" {
			continue
		}
		if _, err := uc.ExamTypeUC.Create(c.Context(), r); err == nil {
			count++
		}
	}
	return c.JSON(fiber.Map{"status": "ok", "imported_count": count})
}
