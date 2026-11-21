package http

import (
	"cbt-engine-service/internal/cbt/domain"
	"fmt"
	"strings"

	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/xuri/excelize/v2"
)

func (h *CBTHandler) HandleListLessons(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	pid := c.Query("academic_period_id")

	var list []domain.Lesson
	var errList error
	if pid != "" {
		list, errList = uc.LessonUC.ListByPeriodID(c.Context(), pid)
	} else {
		list, errList = uc.LessonUC.List(c.Context())
	}
	if errList != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "error": "internal_error", "detail": errList.Error()})
	}
	if list == nil {
		list = []domain.Lesson{}
	}
	return c.JSON(fiber.Map{"status": "ok", "data": list, "count": len(list)})
}

func (h *CBTHandler) HandleCreateLesson(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	var req domain.Lesson
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}

	res, err := uc.LessonUC.Create(c.Context(), req)
	if err != nil {
		if err == domain.ErrLessonInvalid {
			return c.Status(400).JSON(fiber.Map{"error": "validation_failed"})
		}
		if err == domain.ErrLessonDuplicate {
			return c.Status(409).JSON(fiber.Map{"error": "duplicate_lesson", "message": "Pembelajaran ini sudah ada"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}
	return c.Status(201).JSON(fiber.Map{"status": "ok", "data": res})
}

func (h *CBTHandler) HandleUpdateLesson(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	var req domain.Lesson
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}

	res, err := uc.LessonUC.Update(c.Context(), c.Params("id"), req)
	if err != nil {
		if err == domain.ErrLessonNotFound {
			return c.Status(404).JSON(fiber.Map{"error": "not_found"})
		}
		if err == domain.ErrLessonDuplicate {
			return c.Status(409).JSON(fiber.Map{"error": "duplicate_lesson"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}
	return c.JSON(fiber.Map{"status": "ok", "data": res})
}

func (h *CBTHandler) HandleDeleteLesson(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	if err := uc.LessonUC.Delete(c.Context(), c.Params("id")); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}

func (h *CBTHandler) HandleLessonsTemplate(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	// 1. Ambil Data Referensi
	pid := c.Query("academic_period_id")
	var existingLessons []domain.Lesson
	if pid != "" {
		existingLessons, _ = uc.LessonUC.ListByPeriodID(c.Context(), pid)
	} else {
		existingLessons, _ = uc.LessonUC.List(c.Context())
	}

	usedSubjects := make(map[string]bool)
	for _, l := range existingLessons {
		usedSubjects[l.SubjectID] = true
	}

	allSubjects, _ := uc.SubjectUC.List(c.Context())
	var availableSubjects []domain.Subject
	for _, s := range allSubjects {
		if !usedSubjects[s.ID] {
			availableSubjects = append(availableSubjects, s)
		}
	}

	classes, _ := uc.ClassUC.List(c.Context())
	teachers, _ := uc.TeacherUC.List(c.Context())

	f := excelize.NewFile()
	sheetForm := "Form Isian"
	sheetRef := "Referensi"
	f.SetSheetName("Sheet1", sheetForm)
	f.NewSheet(sheetRef)

	// 2. Isi Sheet Referensi (disembunyikan)
	f.SetCellValue(sheetRef, "A1", "ID_Kelas")
	f.SetCellValue(sheetRef, "B1", "Nama_Kelas")
	f.SetCellValue(sheetRef, "C1", "ID_Guru")
	f.SetCellValue(sheetRef, "D1", "Nama_Guru")

	for i, c := range classes {
		row := i + 2
		f.SetCellValue(sheetRef, fmt.Sprintf("A%d", row), c.ID)
		f.SetCellValue(sheetRef, fmt.Sprintf("B%d", row), c.Nama)
	}
	for i, t := range teachers {
		row := i + 2
		f.SetCellValue(sheetRef, fmt.Sprintf("C%d", row), t.ID)
		f.SetCellValue(sheetRef, fmt.Sprintf("D%d", row), t.Nama)
	}
	f.SetSheetVisible(sheetRef, false) // Sembunyikan sheet referensi

	// 3. Isi Sheet Form Isian
	f.SetCellValue(sheetForm, "A1", "Mata Pelajaran (Otomatis)")
	f.SetCellValue(sheetForm, "B1", "Kelas (Pilih dari Dropdown)")
	f.SetCellValue(sheetForm, "C1", "Guru Pengampu (Pilih dari Dropdown)")

	// 4. Isi Otomatis Kolom A (Mapel yang belum ada)
	for i, s := range availableSubjects {
		f.SetCellValue(sheetForm, fmt.Sprintf("A%d", i+2), s.Nama)
	}

	// 5. Terapkan Data Validation (Dropdown)
	// Kelas (Kolom B)
	if len(classes) > 0 {
		dvKelas := excelize.NewDataValidation(true)
		dvKelas.Sqref = "B2:B1000"
		dvKelas.Type = "list"
		dvKelas.Formula1 = fmt.Sprintf("=%s!$B$2:$B$%d", sheetRef, len(classes)+1)
		f.AddDataValidation(sheetForm, dvKelas)
	}

	// Guru (Kolom C)
	if len(teachers) > 0 {
		dvGuru := excelize.NewDataValidation(true)
		dvGuru.Sqref = "C2:C1000"
		dvGuru.Type = "list"
		dvGuru.Formula1 = fmt.Sprintf("=%s!$D$2:$D$%d", sheetRef, len(teachers)+1)
		f.AddDataValidation(sheetForm, dvGuru)
	}

	// 6. Export
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", "attachment; filename=template_pembelajaran.xlsx")
	return f.Write(c.Response().BodyWriter())
}

func (h *CBTHandler) HandleImportLessons(c *fiber.Ctx) error {
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

		ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
		var preview []fiber.Map

		if ext == ".xlsx" || ext == ".xls" {
			f, err := excelize.OpenReader(file)
			if err != nil {
				return c.Status(400).JSON(fiber.Map{"error": "format Excel tidak valid"})
			}
			defer f.Close()
			rows, err := f.GetRows("Form Isian")
			if err != nil || len(rows) < 2 {
				return c.Status(400).JSON(fiber.Map{"error": "sheet 'Form Isian' kosong atau tidak valid"})
			}

			// Ambil data referensi untuk Lookup
			allSubjects, _ := uc.SubjectUC.List(c.Context())
			allClasses, _ := uc.ClassUC.List(c.Context())
			allTeachers, _ := uc.TeacherUC.List(c.Context())

			subjectMap := make(map[string]string) // Nama -> ID
			for _, s := range allSubjects {
				subjectMap[s.Nama] = s.ID
			}
			classMap := make(map[string]string)
			for _, c := range allClasses {
				classMap[c.Nama] = c.ID
			}
			teacherMap := make(map[string]string)
			for _, t := range allTeachers {
				teacherMap[t.Nama] = t.ID
			}

			for i, row := range rows[1:] { // Skip header
				if len(row) < 3 {
					continue
				}

				subjName := strings.TrimSpace(row[0])
				className := strings.TrimSpace(row[1])
				teacherName := strings.TrimSpace(row[2])

				subjID := subjectMap[subjName]
				classID := classMap[className]
				teacherID := teacherMap[teacherName]

				errMsg := ""
				if subjID == "" {
					errMsg += "Mapel tidak ditemukan. "
				}
				if classID == "" {
					errMsg += "Kelas tidak ditemukan. "
				}
				if teacherID == "" {
					errMsg += "Guru tidak ditemukan. "
				}

				var errVal interface{} = nil
				if errMsg != "" {
					errVal = strings.TrimSpace(errMsg)
				}

				preview = append(preview, fiber.Map{
					"_rowNumber":   i + 1,
					"subject_id":   subjID,
					"subject_nama": subjName,
					"class_id":     classID,
					"class_nama":   className,
					"teacher_id":   teacherID,
					"teacher_nama": teacherName,
					"_error":       errVal,
				})
			}
		} else {
			return c.Status(400).JSON(fiber.Map{"error": "Hanya file Excel (.xlsx) yang didukung untuk saat ini"})
		}
		return c.JSON(fiber.Map{"status": "ok", "data": preview, "errors": []string{}})
	}

	// Proses Konfirmasi Import
	var body struct {
		Rows []domain.Lesson `json:"rows"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_json"})
	}

	count := 0
	for _, r := range body.Rows {
		// Karena frontend sudah mengirim ID dari hasil preview, kita bisa langsung simpan
		if r.SubjectID == "" || r.ClassID == "" || r.TeacherID == "" {
			continue
		}
		if _, err := uc.LessonUC.Create(c.Context(), r); err == nil {
			count++
		}
	}
	return c.JSON(fiber.Map{"status": "ok", "imported_count": count})
}
