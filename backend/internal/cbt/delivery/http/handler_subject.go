package http

import (
	"cbt-engine-service/internal/cbt/domain"
	"encoding/csv"
	"github.com/gofiber/fiber/v2"
	"strings"
)

func (h *CBTHandler) HandleListSubjects(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	list, _ := uc.SubjectUC.List(c.Context())
	if list == nil {
		list = []domain.Subject{}
	}
	return c.JSON(fiber.Map{"status": "ok", "data": list, "count": len(list)})
}

func (h *CBTHandler) HandleCreateSubject(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	var req domain.Subject
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}

	res, err := uc.SubjectUC.Create(c.Context(), req)
	if err != nil {
		switch err {
		case domain.ErrSubjectInvalid:
			return c.Status(400).JSON(fiber.Map{"error": "validation_failed"})
		case domain.ErrSubjectKodeTaken:
			return c.Status(409).JSON(fiber.Map{"error": "kode_taken"})
		default:
			return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
		}
	}
	return c.Status(201).JSON(fiber.Map{"status": "ok", "data": res})
}

func (h *CBTHandler) HandleUpdateSubject(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	id := c.Params("id")
	var req domain.Subject
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}

	res, err := uc.SubjectUC.Update(c.Context(), id, req)
	if err != nil {
		switch err {
		case domain.ErrSubjectNotFound:
			return c.Status(404).JSON(fiber.Map{"error": "not_found"})
		case domain.ErrSubjectInvalid:
			return c.Status(400).JSON(fiber.Map{"error": "validation_failed"})
		case domain.ErrSubjectKodeTaken:
			return c.Status(409).JSON(fiber.Map{"error": "kode_taken"})
		default:
			return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
		}
	}
	return c.JSON(fiber.Map{"status": "ok", "data": res})
}

func (h *CBTHandler) HandleDeleteSubject(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	id := c.Params("id")

	if err := uc.SubjectUC.Delete(c.Context(), id); err != nil {
		switch err {
		case domain.ErrSubjectNotFound:
			return c.Status(404).JSON(fiber.Map{"error": "not_found"})
		case domain.ErrSubjectInUse:
			return c.Status(409).JSON(fiber.Map{"error": "subject_in_use"})
		default:
			return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
		}
	}
	return c.JSON(fiber.Map{"status": "ok"})
}

func (h *CBTHandler) HandleSubjectsTemplate(c *fiber.Ctx) error {
	csvContent := "kode,nama,nama_singkat,kelompok,tingkat,jurusan_kode\nBIN-10,Bahasa Indonesia,B.IND,WAJIB,10,\nMTK-10,Matematika,MTK,WAJIB,10,\n"
	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", "attachment; filename=template_mapel.csv")
	return c.SendString(csvContent)
}

func (h *CBTHandler) HandleImportSubjects(c *fiber.Ctx) error {
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
			if len(row) < 5 {
				continue
			}
			preview = append(preview, fiber.Map{
				"_rowNumber": i + 1, "kode": strings.TrimSpace(row[0]), "nama": strings.TrimSpace(row[1]),
				"nama_singkat": strings.TrimSpace(row[2]), "kelompok": strings.TrimSpace(row[3]),
				"tingkat": strings.TrimSpace(row[4]), "jurusan_kode": strings.TrimSpace(row[5]), "_error": nil,
			})
		}
		return c.JSON(fiber.Map{"status": "ok", "data": preview, "errors": []string{}})
	}

	var body struct {
		Rows []domain.Subject `json:"rows"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}

	count := 0
	for _, r := range body.Rows {
		if r.Kode == "" || r.Nama == "" {
			continue
		}
		if _, err := uc.SubjectUC.Create(c.Context(), r); err == nil {
			count++
		}
	}
	return c.JSON(fiber.Map{"status": "ok", "imported_count": count})
}
