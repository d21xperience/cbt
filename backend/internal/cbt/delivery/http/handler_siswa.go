// internal/cbt/delivery/http/handler_siswa.go
// BCR-1: Handler master siswa + participants (derived).
// Semua handler resolve SiswaUC via factory (tenant-scoped).
package http

import (
	"encoding/csv"
	"fmt"
	"log"
	"strings"

	"cbt-engine-service/internal/cbt/domain"
	"cbt-engine-service/internal/tenant"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// siswaUC — helper resolve SiswaUC dari factory.
func (h *CBTHandler) siswaUC(c *fiber.Ctx) (*domain.Siswa, error) {
	// placeholder return type — ganti dengan *cbtUC.SiswaUseCase
	return nil, nil
}

// ─────────────────────────────────────────
// Master Siswa CRUD
// ─────────────────────────────────────────

// HandleListStudents — GET /admin/students
// Query: ?search=&kelas_id=&status=
func (h *CBTHandler) HandleListStudents(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	filter := domain.SiswaFilter{
		Search:           c.Query("search"),
		KelasID:          c.Query("kelas_id"),
		Status:           c.Query("status"),
		AcademicPeriodID: c.Query("academic_period_id"),
	}
	list, err := uc.SiswaUC.List(c.Context(), filter)
	if err != nil {
		log.Printf("[Handler] ListStudents: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
	}

	// inject tenant_slug dari context
	info := tenant.FromContext(c.UserContext())
	for i := range list {
		if info != nil {
			list[i].TenantSlug = info.Subdomain
		}
		if list[i].Source == "" {
			list[i].Source = "SISWA"
		}
	}

	return c.JSON(fiber.Map{
		"status": "ok",
		"data":   list,
		"count":  len(list),
	})
}

// HandleCreateStudent — POST /admin/students
func (h *CBTHandler) HandleCreateStudent(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status": "error",
			"error":  "tenant_db_unavailable",
		})
	}

	var req domain.Siswa
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status": "error",
			"error":  "invalid_body",
		})
	}

	// FIX F: sanitize — trim whitespace + strip trailing CR/NUL.
	req.NIS = strings.TrimSpace(req.NIS)
	req.NISN = strings.TrimSpace(req.NISN)
	req.Nama = strings.TrimSpace(req.Nama)
	req.KelasID = strings.TrimSpace(req.KelasID)
	req.KelasNama = strings.TrimSpace(req.KelasNama)

	created, _, err := uc.SiswaUC.Create(c.Context(), req)
	if err != nil {
		switch err {
		case domain.ErrSiswaInvalidInput:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"error":   "validation_failed",
				"message": "nis, nama, kelas_id wajib",
			})
		case domain.ErrSiswaNISDuplicated:
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"status":  "error",
				"error":   "nis_taken",
				"message": "NIS '" + req.NIS + "' sudah terdaftar",
			})
		case domain.ErrSiswaNISNDuplicated:
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"status":  "error",
				"error":   "nisn_taken",
				"message": "NISN '" + req.NISN + "' sudah terdaftar",
			})
		}
		log.Printf("[Handler] CreateStudent: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status": "error",
			"error":  "internal_error",
		})
	}

	info := tenant.FromContext(c.UserContext())
	if info != nil {
		created.TenantSlug = info.Subdomain
	}
	created.Source = "SISWA"

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"status": "ok",
		"data":   created,
	})
}

// HandleUpdateStudent — PUT /admin/students/:id
func (h *CBTHandler) HandleUpdateStudent(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	id := c.Params("id")
	var req domain.Siswa
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_body"})
	}

	updated, err := uc.SiswaUC.Update(c.Context(), id, req)
	if err != nil {
		switch err {
		case domain.ErrSiswaNotFound:
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not_found"})
		case domain.ErrSiswaNISDuplicated:
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "nis_taken"})
		case domain.ErrSiswaNISNDuplicated:
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "nisn_taken"})
		case domain.ErrSiswaInvalidInput:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_input"})
		}
		log.Printf("[Handler] UpdateStudent: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
	}

	info := tenant.FromContext(c.UserContext())
	if info != nil {
		updated.TenantSlug = info.Subdomain
	}
	updated.Source = "SISWA"

	return c.JSON(fiber.Map{"status": "ok", "data": updated})
}

// HandleDeleteStudent — DELETE /admin/students/:id
func (h *CBTHandler) HandleDeleteStudent(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}
	id := c.Params("id")
	if err := uc.SiswaUC.Delete(c.Context(), id); err != nil {
		if err == domain.ErrSiswaNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not_found"})
		}
		log.Printf("[Handler] DeleteStudent: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}

// HandleStudentsTemplate — GET /admin/students/template
// Return CSV template (UTF-8 BOM).
func (h *CBTHandler) HandleStudentsTemplate(c *fiber.Ctx) error {
	csv := "\uFEFFnisn,nis,nama,jenis_kelamin,tanggal_lahir,kelas\n" +
		"1234500101,2024101,Rizky Pratama,L,2008-01-15,10 IPA 1\n" +
		"1234500102,2024102,Sari Dewi,P,2008-03-20,10 IPA 1\n" +
		"1234500103,,Tanpa Kelas,L,2008-05-10,\n"

	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", `attachment; filename="template_siswa.csv"`)
	return c.SendString(csv)
}

// HandleImportStudents — POST /admin/students/import?preview=true|false
// Preview: return sample (match mock). Import: accept JSON {rows:[...]}, insert.
func (h *CBTHandler) HandleImportStudents(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	isPreview := c.Query("preview") == "true" || c.Query("preview") == "1"

	// 1. Ambil mapping kelas_id dari database
	classList, _ := uc.ClassUC.List(c.Context())
	classMap := make(map[string]string)
	for _, cls := range classList {
		classMap[strings.ToLower(strings.TrimSpace(cls.Nama))] = cls.ID
	}

	if isPreview {
		fileHeader, err := c.FormFile("file")
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "file tidak ditemukan"})
		}

		file, err := fileHeader.Open()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal membuka file"})
		}
		defer file.Close()

		reader := csv.NewReader(file)
		reader.FieldsPerRecord = -1 // longgar terhadap jumlah kolom
		records, err := reader.ReadAll()
		if err != nil || len(records) < 2 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format CSV tidak valid atau kosong"})
		}

		// Parse CSV (asumsi baris 0 adalah header: NISN, NIS, Nama, JK, TanggalLahir, Kelas)
		var preview []fiber.Map
		for i, row := range records[1:] {
			if len(row) < 6 {
				continue // skip baris tidak lengkap
			}
			nisn := strings.TrimSpace(row[0])
			nis := strings.TrimSpace(row[1])
			nama := strings.TrimSpace(row[2])
			jk := strings.TrimSpace(row[3])
			tgl := strings.TrimSpace(row[4])
			kelasNama := strings.TrimSpace(row[5])

			errMsg := ""
			if nisn == "" || nama == "" {
				errMsg = "NISN dan Nama wajib diisi"
			} else if classMap[strings.ToLower(kelasNama)] == "" {
				errMsg = fmt.Sprintf("Kelas '%s' tidak ditemukan", kelasNama)
			}

			preview = append(preview, fiber.Map{
				"_rowNumber":    i + 1,
				"nisn":          nisn,
				"nis":           nis,
				"nama":          nama,
				"jenis_kelamin": jk,
				"tanggal_lahir": tgl,
				"kelas_nama":    kelasNama,
				"_error":        errMsg,
			})
		}
		return c.JSON(fiber.Map{"status": "ok", "data": preview, "errors": []string{}})
	}

	// 2. Real import (dari JSON hasil preview Frontend)
	var body struct {
		Rows []struct {
			NISN         string `json:"nisn"`
			NIS          string `json:"nis"`
			Nama         string `json:"nama"`
			JenisKelamin string `json:"jenis_kelamin"`
			TanggalLahir string `json:"tanggal_lahir"`
			KelasNama    string `json:"kelas_nama"`
		} `json:"rows"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_json"})
	}

	var toCreate []domain.Siswa
	for _, r := range body.Rows {
		if r.NISN == "" || r.Nama == "" {
			continue
		}
		kelasID := classMap[strings.ToLower(strings.TrimSpace(r.KelasNama))]
		if kelasID == "" {
			continue // Skip jika kelas tidak valid (mencegah error di DB)
		}

		toCreate = append(toCreate, domain.Siswa{
			ID:           uuid.NewString(),
			NIS:          r.NIS,
			NISN:         r.NISN,
			Nama:         r.Nama,
			JenisKelamin: r.JenisKelamin,
			TanggalLahir: r.TanggalLahir,
			KelasID:      kelasID,
			KelasNama:    r.KelasNama,
			Status:       "AKTIF",
		})
	}

	count, err := uc.SiswaUC.BulkCreate(c.Context(), toCreate)
	if err != nil {
		log.Printf("[Handler] ImportStudents: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "import_failed"})
	}

	return c.JSON(fiber.Map{"status": "ok", "imported_count": count})
}

// HandleListParticipants — GET /admin/participants
// Query: ?source=&search=
func (h *CBTHandler) HandleListParticipants(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	filter := domain.SiswaFilter{
		Search: c.Query("search"),
		Status: "AKTIF", // participants = siswa AKTIF
	}
	list, err := uc.SiswaUC.List(c.Context(), filter)
	if err != nil {
		log.Printf("[Handler] ListParticipants: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
	}

	info := tenant.FromContext(c.UserContext())
	out := make([]fiber.Map, 0, len(list))
	for _, s := range list {
		tenantSlug := ""
		if info != nil {
			tenantSlug = info.Subdomain
		}
		out = append(out, fiber.Map{
			"id":            s.ID,
			"nis":           s.NIS,
			"nisn":          s.NISN,
			"nama":          s.Nama,
			"kelas_id":      s.KelasID,
			"kelas_nama":    s.KelasNama,
			"status":        s.Status,
			"exam_password": s.ExamPassword, // plaintext, sudah didekripsi di usecase
			"source":        "SISWA",
			"tenant_slug":   tenantSlug,
		})
	}

	return c.JSON(fiber.Map{"status": "ok", "data": out, "count": len(out)})
}

// HandleResetParticipantPassword — POST /admin/participants/:id/reset-password
func (h *CBTHandler) HandleResetParticipantPassword(c *fiber.Ctx) error {
	uc, err := h.factory.Usecases(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "tenant_db_unavailable"})
	}

	id := c.Params("id")
	newPwd, err := uc.SiswaUC.ResetPassword(c.Context(), id)
	if err != nil {
		if err == domain.ErrSiswaNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "student_not_found"})
		}
		if err == domain.ErrSiswaInvalidInput {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "nisn_missing"})
		}
		log.Printf("[Handler] ResetParticipantPassword: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
	}

	return c.JSON(fiber.Map{
		"status":  "ok",
		"message": "Password berhasil di-reset.",
		"data": fiber.Map{
			"id":            id,
			"exam_password": newPwd,
		},
	})
}
