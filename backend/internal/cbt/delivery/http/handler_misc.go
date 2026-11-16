package http

import (
	"encoding/csv"
	"strings"

	"cbt-engine-service/internal/cbt/domain"

	"github.com/gofiber/fiber/v2"
)

// ========================
// TEACHERS
// ========================
func (h *CBTHandler) HandleListTeachers(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	list, _ := uc.TeacherUC.List(c.Context())
	if list == nil {
		list = []domain.Teacher{}
	}
	return c.JSON(fiber.Map{"status": "ok", "data": list, "count": len(list)})
}

func (h *CBTHandler) HandleCreateTeacher(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	var req domain.Teacher
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}
	// PERBAIKAN: Tampung return value (res) dari Usecase
	res, err := uc.TeacherUC.Create(c.Context(), req)
	if err != nil {
		switch err {
		case domain.ErrTeacherInvalidInput:
			return c.Status(400).JSON(fiber.Map{
				"status":  "error",
				"error":   "validation_failed",
				"message": "nama wajib diisi",
			})
		}
		return c.Status(500).JSON(fiber.Map{"status": "error", "error": "internal_error"})
	}
	return c.Status(201).JSON(fiber.Map{"status": "ok", "data": res})
}

func (h *CBTHandler) HandleUpdateTeacher(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	var req domain.Teacher
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}
	if err := uc.TeacherUC.Update(c.Context(), c.Params("id"), req); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}

func (h *CBTHandler) HandleDeleteTeacher(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	if err := uc.TeacherUC.Delete(c.Context(), c.Params("id")); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}

func (h *CBTHandler) HandleTeachersTemplate(c *fiber.Ctx) error {
	csvContent := "nama,nip,email,jenis_kelamin,kode_mapel,is_wali_kelas,kelas_binaan\nBudi Santoso,19800101,budi@sekolah.id,L,MTK-10|BIN-10,0,\nSiti Aminah,19850202,siti@sekolah.id,P,BING-10,1,X RPL 1\n"
	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", "attachment; filename=template_guru.csv")
	return c.SendString(csvContent)
}

func (h *CBTHandler) HandleImportTeachers(c *fiber.Ctx) error {
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
			preview = append(preview, fiber.Map{
				"_rowNumber": i + 1, "nama": strings.TrimSpace(row[0]), "nip": strings.TrimSpace(row[1]),
				"email": strings.TrimSpace(row[2]), "jenis_kelamin": strings.TrimSpace(row[3]),
				"kode_mapel": strings.TrimSpace(row[4]), "is_wali_kelas": strings.TrimSpace(row[5]),
				"kelas_binaan": strings.TrimSpace(row[6]), "_error": nil,
			})
		}
		return c.JSON(fiber.Map{"status": "ok", "data": preview, "errors": []string{}})
	}

	var body struct {
		Rows []struct {
			Nama         string `json:"nama"`
			NIP          string `json:"nip"`
			Email        string `json:"email"`
			JenisKelamin string `json:"jenis_kelamin"`
			KodeMapel    string `json:"kode_mapel"`
			IsWaliKelas  string `json:"is_wali_kelas"`
			KelasBinaan  string `json:"kelas_binaan"`
		} `json:"rows"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}

	// Ambil referensi Mapel & Kelas untuk mapping
	subjects, _ := uc.SubjectUC.List(c.Context())
	subjectMap := make(map[string]string)
	for _, s := range subjects {
		subjectMap[strings.ToLower(s.Kode)] = s.ID
	}

	classes, _ := uc.ClassUC.List(c.Context())
	classMap := make(map[string]string)
	for _, cl := range classes {
		classMap[strings.ToLower(cl.Nama)] = cl.ID
	}

	count := 0
	for _, r := range body.Rows {
		if r.Nama == "" {
			continue
		}

		t := domain.Teacher{
			Nama: r.Nama, NIP: r.NIP, Email: r.Email, JenisKelamin: r.JenisKelamin,
		}

		// Parse Kode Mapel
		var subIDs []string
		for _, code := range strings.Split(r.KodeMapel, "|") {
			if id, ok := subjectMap[strings.ToLower(strings.TrimSpace(code))]; ok {
				subIDs = append(subIDs, id)
			}
		}
		t.TeachingSubjectIDs = subIDs

		// Parse Wali Kelas
		if r.IsWaliKelas == "1" || strings.ToLower(r.IsWaliKelas) == "true" {
			t.IsHomeroom = true
			t.HomeroomClassID = classMap[strings.ToLower(strings.TrimSpace(r.KelasBinaan))]
			t.HomeroomClassName = strings.TrimSpace(r.KelasBinaan)
		}

		if _, err := uc.TeacherUC.Create(c.Context(), t); err == nil {
			count++
		}
	}
	return c.JSON(fiber.Map{"status": "ok", "imported_count": count})
}

// ========================
// ROOMS
// ========================
func (h *CBTHandler) HandleListRooms(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	list, _ := uc.RoomUC.List(c.Context())
	if list == nil {
		list = []domain.Room{}
	}
	return c.JSON(fiber.Map{"status": "ok", "data": list, "count": len(list)})
}

func (h *CBTHandler) HandleCreateRoom(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	var req domain.Room
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}
	if err := uc.RoomUC.Create(c.Context(), req); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}
	// PERBAIKAN: Gunakan 'req' karena RoomUC.Create tidak mengembalikan 'res'
	return c.Status(201).JSON(fiber.Map{"status": "ok", "data": req})
}

func (h *CBTHandler) HandleUpdateRoom(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	var req domain.Room
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}
	if err := uc.RoomUC.Update(c.Context(), c.Params("id"), req); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}

func (h *CBTHandler) HandleDeleteRoom(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	if err := uc.RoomUC.Delete(c.Context(), c.Params("id")); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}

func (h *CBTHandler) HandleResetTeacherPassword(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "error": "tenant_db_unavailable"})
	}
	pass, err := uc.TeacherUC.ResetPassword(c.Context(), c.Params("id"))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "error": "internal_error"})
	}
	return c.JSON(fiber.Map{"status": "ok", "new_password": pass})
}
