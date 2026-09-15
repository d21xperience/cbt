// internal/cbt/delivery/http/handler.go
package http

import (
	archiveUsecase "cbt-engine-service/internal/archive/usecase"
	"cbt-engine-service/internal/cbt/domain"
	"cbt-engine-service/internal/cbt/repository"
	cbtUC "cbt-engine-service/internal/cbt/usecase"
	proctoringUsecase "cbt-engine-service/internal/proctoring/usecase"
	schedulingDomain "cbt-engine-service/internal/scheduling/domain"
	schedulingUsecase "cbt-engine-service/internal/scheduling/usecase"
	"cbt-engine-service/pkg/auth"
	"encoding/json"
	"log"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
)

type CBTHandler struct {
	schedulingUC      *schedulingUsecase.SchedulingUseCase
	adminLoginUC      *schedulingUsecase.AdminLoginUseCase
	participantAuthUC *schedulingUsecase.ParticipantAuthUseCase // ← NEW
	credentialsUC     *schedulingUsecase.CredentialsUseCase     // ← NEW
	examUC            *cbtUC.ExamUseCase
	archiveUC         *archiveUsecase.ArchiveUseCase
	proctoringUC      *proctoringUsecase.ProctoringUseCase
	sessionUC         repository.SessionRepository
	tokenUC           *cbtUC.TokenUseCase
}
type ExternalImportRequest struct {
	ExamID   string                                 `json:"exam_id"`
	Students []schedulingDomain.EligibleParticipant `json:"students"` // Atau parse dari CSV
}

type AdminLoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	TenantID string `json:"tenant_id,omitempty"`
}

func NewCBTHandler(
	sched *schedulingUsecase.SchedulingUseCase,
	adminLogin *schedulingUsecase.AdminLoginUseCase,
	participantAuth *schedulingUsecase.ParticipantAuthUseCase, // ← NEW
	credentials *schedulingUsecase.CredentialsUseCase, // ← NEW
	exam *cbtUC.ExamUseCase,
	arch *archiveUsecase.ArchiveUseCase,
	proc *proctoringUsecase.ProctoringUseCase,
	sessRepo repository.SessionRepository,
	tokenUC *cbtUC.TokenUseCase,
) *CBTHandler {
	return &CBTHandler{
		schedulingUC:      sched,
		adminLoginUC:      adminLogin,
		participantAuthUC: participantAuth,
		credentialsUC:     credentials,
		examUC:            exam,
		archiveUC:         arch,
		proctoringUC:      proc,
		sessionUC:         sessRepo,
		tokenUC:           tokenUC,
	}
}

type CreateSessionRequest struct {
	ExamID      string `json:"exam_id"`
	SemesterID  string `json:"semester_id"`
	SessionType string `json:"session_type"` // REGULER | SUSULAN
	StartTime   string `json:"start_time"`   // RFC3339
	EndTime     string `json:"end_time"`     // RFC3339
}

// ==========================================
// ADMIN HANDLERS
// ==========================================

type SyncRequest struct {
	PembelajaranID string `json:"pembelajaran_id"`
	SemesterID     string `json:"semester_id"`
}

func (h *CBTHandler) HandleSync(c *fiber.Ctx) error {
	var req SyncRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	count, err := h.schedulingUC.SyncParticipantsFromSiakad(c.Context(), req.PembelajaranID, req.SemesterID)
	if err != nil {
		log.Printf("[HANDLER] Sync failed: %v", err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Gagal sinkronisasi. Pastikan SIAKAD & Cloudflare Tunnel aktif."})
	}

	return c.JSON(fiber.Map{
		"message":      "Sinkronisasi berhasil",
		"synced_count": count,
	})
}

type SessionRequest struct {
	ExamID      string `json:"exam_id"`
	SessionType string `json:"session_type"` // REGULER / SUSULAN
	StartTime   string `json:"start_time"`
	EndTime     string `json:"end_time"`
}

// HandleCreateSession — persistence ke SQLite (bukan mock lagi)
func (h *CBTHandler) HandleCreateSession(c *fiber.Ctx) error {
	var req CreateSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}
	if req.ExamID == "" || req.SessionType == "" || req.StartTime == "" || req.EndTime == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "exam_id, session_type, start_time, end_time wajib diisi",
		})
	}

	start, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "start_time format harus RFC3339"})
	}
	end, err := time.Parse(time.RFC3339, req.EndTime)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "end_time format harus RFC3339"})
	}
	if !end.After(start) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "end_time harus setelah start_time"})
	}

	sess := &domain.ExamSession{
		ID:          uuid.NewString(),
		ExamID:      req.ExamID,
		SemesterID:  req.SemesterID,
		SessionType: domain.SessionType(req.SessionType),
		StartTime:   start,
		EndTime:     end,
		Status:      "SCHEDULED",
	}

	if h.sessionUC == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Session repo belum siap"})
	}
	if err := h.sessionUC.CreateSession(c.Context(), sess); err != nil {
		log.Printf("[HANDLER] CreateSession: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Sesi ujian berhasil dibuat",
		"session": sess,
	})
}

type ArchiveRequest struct {
	SchoolID            string `json:"school_id"`
	SemesterID          string `json:"semester_id"`
	IsEndOfAcademicYear bool   `json:"is_end_of_academic_year"`
}

func (h *CBTHandler) HandleArchive(c *fiber.Ctx) error {
	var req ArchiveRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	err := h.archiveUC.ArchiveAndReset(c.Context(), req.SchoolID, req.SemesterID, req.IsEndOfAcademicYear)
	if err != nil {
		log.Printf("[HANDLER] Archive failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "Proses archive & reset berhasil. Sistem telah dikembalikan ke kondisi fresh.",
	})
}

// ==========================================
// PARTICIPANT HANDLERS
// ==========================================

// type LoginRequest struct {
// 	NISN           string `json:"nisn"`
// 	PembelajaranID string `json:"pembelajaran_id"` // Acts as ExamID for CBT
// }

// ============================================
// PHASE D1: Peserta Login (username + password)
// ============================================

type ParticipantLoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (h *CBTHandler) HandleLogin(c *fiber.Ctx) error {
	var req ParticipantLoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Username == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "username & password wajib"})
	}

	result, err := h.participantAuthUC.Login(c.Context(), req.Username, req.Password)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	// ✅ FIX: JWT uid = participant_id (UUID), konsisten dengan DB & Redis
	token, err := auth.GenerateTokenFull(result.ParticipantID, "PARTICIPANT", "", "", 6*time.Hour)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal generate token"})
	}

	return c.JSON(fiber.Map{
		"status": "authorized",
		"role":   "PARTICIPANT",
		"token":  token,
		"user": fiber.Map{
			"participant_id": result.ParticipantID, // ← NEW
			"nisn":           result.NISN,
			"name":           result.FullName,
			"rombel":         result.RombelName,
		},
		"eligible_exams": result.ExamIDs,
	})
}

// ============================================
// PHASE 3/5: SECURE HANDLERS — identity dari JWT
// ============================================

// HandleStartExam — participant_id & exam_id dari JWT (bukan body)
func (h *CBTHandler) HandleStartExam(c *fiber.Ctx) error {
	participantID, _ := c.Locals("userID").(string)
	examID, _ := c.Locals("examID").(string)
	if participantID == "" || examID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Identity tidak valid di token",
		})
	}

	// Timer guard — server authority
	if _, err := h.examUC.CheckTimer(c.Context(), participantID, examID, h.sessionUC); err != nil {
		if err == cbtUC.ErrExamExpired {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Waktu ujian sudah habis"})
		}
		if err == cbtUC.ErrExamNotStarted {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Ujian belum dimulai"})
		}
		// ErrExamNoSession → tetap izinkan, mungkin session belum di-assign
	}

	questions, err := h.examUC.StartExam(c.Context(), participantID, examID)
	if err != nil {
		log.Printf("[HANDLER] StartExam: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Tandai peserta IN_PROGRESS (untuk monitoring guru)
	if h.sessionUC != nil {
		if sess, _ := h.sessionUC.GetParticipantSession(c.Context(), participantID, examID); sess != nil {
			_ = h.sessionUC.MarkParticipantStarted(c.Context(), participantID, sess.ID)
		}
	}

	return c.JSON(fiber.Map{
		"status":    "exam_started",
		"questions": questions,
	})
}

// HandleSubmitAnswer — participant_id & exam_id dari JWT
// Body hanya butuh: { "question_id": "...", "answer": "..." }
type SubmitAnswerBody struct {
	QuestionID string `json:"question_id"`
	Answer     string `json:"answer"`
}

func (h *CBTHandler) HandleSubmitAnswer(c *fiber.Ctx) error {
	participantID, _ := c.Locals("userID").(string)
	examID, _ := c.Locals("examID").(string)
	if participantID == "" || examID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Identity tidak valid"})
	}

	var body SubmitAnswerBody
	if err := c.BodyParser(&body); err != nil || body.QuestionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "question_id wajib"})
	}

	// Timer guard
	if _, err := h.examUC.CheckTimer(c.Context(), participantID, examID, h.sessionUC); err != nil {
		if err == cbtUC.ErrExamExpired {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Waktu ujian habis. Jawaban tidak diterima.",
			})
		}
	}

	err := h.examUC.SubmitAnswer(c.Context(), participantID, examID, body.QuestionID, body.Answer)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal simpan jawaban"})
	}
	return c.JSON(fiber.Map{"status": "answer_saved"})
}

// HandleFinishExam — participant_id & exam_id dari JWT, no body
func (h *CBTHandler) HandleFinishExam(c *fiber.Ctx) error {
	participantID, _ := c.Locals("userID").(string)
	examID, _ := c.Locals("examID").(string)
	if participantID == "" || examID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Identity tidak valid"})
	}

	result, err := h.examUC.FinishExam(c.Context(), participantID, examID)
	if err != nil {
		log.Printf("[HANDLER] FinishExam: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyelesaikan ujian"})
	}

	// Tandai peserta COMPLETED
	if h.sessionUC != nil {
		if sess, _ := h.sessionUC.GetParticipantSession(c.Context(), participantID, examID); sess != nil {
			_ = h.sessionUC.MarkParticipantSubmitted(c.Context(), participantID, sess.ID)
		}
	}

	return c.JSON(fiber.Map{
		"status":          "exam_completed",
		"participant_id":  result.ParticipantID,
		"total_questions": result.TotalQuestions,
		"correct_answers": result.CorrectAnswers,
		"final_score":     result.FinalScore,
	})
}

// Tambahkan route di RegisterRoutes:
// admin.Post("/participants/import-external", h.HandleImportExternalCSV)

func (h *CBTHandler) HandleImportExternalCSV(c *fiber.Ctx) error {
	examID := c.FormValue("exam_id")
	semesterID := c.FormValue("semester_id")
	schoolName := c.FormValue("school_name")

	if examID == "" || semesterID == "" || schoolName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "exam_id, semester_id, dan school_name wajib diisi"})
	}

	// 1. Ambil file dari form-data
	fileHeader, err := c.FormFile("csv_file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "File CSV (csv_file) tidak ditemukan"})
	}

	// 2. Batasi ukuran file maksimal 10MB (Mencegah spam upload yang memenuhi disk temp VPS)
	if fileHeader.Size > 10*1024*1024 {
		return c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{"error": "Ukuran file CSV maksimal 10MB"})
	}

	// 3. Buka file (Fiber otomatis menyimpan file > 2MB di temporary disk, bukan di RAM)
	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal membuka file"})
	}
	defer file.Close()

	// 4. Proses streaming ke UseCase
	count, err := h.schedulingUC.ImportExternalFromCSV(c.Context(), examID, semesterID, schoolName, file)
	if err != nil {
		log.Printf("[HANDLER] Import CSV failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message":        "Import peserta eksternal berhasil",
		"imported_count": count,
	})
}

// HandleAdminLogin (Dummy: Hardcoded untuk testing. Di produksi hubungkan ke DB Admin)
func (h *CBTHandler) HandleAdminLogin(c *fiber.Ctx) error {
	var req AdminLoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.TenantID == "" {
		req.TenantID = c.Get("X-Tenant-Slug", "default")
	}
	if req.Username == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "username & password wajib diisi"})
	}

	res, err := h.adminLoginUC.Login(c.Context(), req.TenantID, req.Username, req.Password)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Username atau password salah"})
	}

	token, err := auth.GenerateTokenFull(res.AdminID, res.Role, "", res.TenantID, schedulingUsecase.AdminTokenDuration)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal generate token"})
	}

	return c.JSON(fiber.Map{
		"token": token,
		"role":  res.Role,
		"user": fiber.Map{
			"id":        res.AdminID,
			"username":  res.Username,
			"role":      res.Role,
			"tenant_id": res.TenantID,
		},
	})
}

// HandleSuperAdminLogin — endpoint terpisah untuk halaman /super
func (h *CBTHandler) HandleSuperAdminLogin(c *fiber.Ctx) error {
	var req AdminLoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	res, err := h.adminLoginUC.LoginSuperAdmin(c.Context(), req.Username, req.Password)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Username atau password salah"})
	}
	token, err := auth.GenerateTokenFull(res.AdminID, res.Role, "", res.TenantID, schedulingUsecase.SuperTokenDuration)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal generate token"})
	}
	return c.JSON(fiber.Map{
		"token": token,
		"role":  res.Role,
		"user": fiber.Map{
			"id":        res.AdminID,
			"username":  res.Username,
			"role":      res.Role,
			"tenant_id": res.TenantID,
		},
	})
}

func (h *CBTHandler) HandleDownloadTemplate(c *fiber.Ctx) error {
	xls := excelize.NewFile()

	// ==========================================
	// SHEET 1: BANK SOAL
	// ==========================================
	sheet1 := "Bank_Soal"
	xls.SetSheetName("Sheet1", sheet1)

	// Header dengan styling
	headers := []string{
		"question_type", "question_text", "media_url",
		"opt_a", "opt_b", "opt_c", "opt_d", "opt_e",
		"correct_option", "score", "rubric",
	}

	// Style header (biru, bold, putih)
	headerStyle, _ := xls.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "#FFFFFF", Size: 12},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"#2563EB"}},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    []excelize.Border{{Type: "left", Color: "#000000", Style: 1}, {Type: "top", Color: "#000000", Style: 1}, {Type: "right", Color: "#000000", Style: 1}, {Type: "bottom", Color: "#000000", Style: 1}},
	})

	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		xls.SetCellValue(sheet1, cell, h)
		xls.SetCellStyle(sheet1, cell, cell, headerStyle)
	}

	// Lebar kolom otomatis
	xls.SetColWidth(sheet1, "A", "A", 15) // question_type
	xls.SetColWidth(sheet1, "B", "B", 50) // question_text
	xls.SetColWidth(sheet1, "C", "C", 40) // media_url
	xls.SetColWidth(sheet1, "D", "H", 30) // opsi A-E
	xls.SetColWidth(sheet1, "I", "I", 15) // correct
	xls.SetColWidth(sheet1, "J", "J", 10) // score
	xls.SetColWidth(sheet1, "K", "K", 40) // rubric

	// ==========================================
	// CONTOH SOAL (5 baris contoh dengan berbagai tipe)
	// ==========================================
	examples := [][]interface{}{
		// 1. PG Biasa
		{"PG", "Berapakah hasil dari 15 + 25?", "", "30", "35", "40", "45", "", "C", "10", ""},

		// 2. PG dengan Rumus Matematika (LaTeX)
		{"PG", "Nilai dari $\\lim_{x \\to 0} \\frac{\\sin x}{x}$ adalah...", "", "0", "1", "$\\infty$", "Tidak ada", "", "B", "10", ""},

		// 3. PG dengan Gambar (URL CDN)
		{"PG", "Perhatikan gambar berikut. <img src='https://cdn.sekolah.id/img/dna.png' />. Gambar tersebut menunjukkan struktur...", "", "RNA", "DNA", "Protein", "Lemak", "", "B", "10", ""},

		// 4. PG dengan Huruf Arab (Bahasa Arab)
		{"PG", "مَا مَعْنَى كَلِمَة 'مَدْرَسَة' ؟", "", "بيت", "مدرسة", "كتاب", "قلم", "", "B", "10", ""},

		// 5. ESSAY dengan Rubrik
		{"ESSAY", "Jelaskan proses fotosintesis secara singkat!", "", "", "", "", "", "", "", "20", "Sebutkan klorofil (5), cahaya matahari (5), CO2+H2O (5), glukosa+O2 (5)"},

		// 6. AUDIO (Listening)
		{"AUDIO", "Dengarkan audio berikut dan jawab pertanyaan. <audio src='https://cdn.sekolah.id/audio/listening1.mp3' />. Apa topik pembicaraan?", "", "Cuaca", "Liburan", "Sekolah", "Kesehatan", "", "C", "15", ""},
	}

	for rowIdx, row := range examples {
		for colIdx, val := range row {
			cell, _ := excelize.CoordinatesToCellName(colIdx+1, rowIdx+2)
			xls.SetCellValue(sheet1, cell, val)
		}
	}

	// ==========================================
	// SHEET 2: PANDUAN
	// ==========================================
	sheet2 := "Panduan"
	xls.NewSheet(sheet2)

	guides := [][]interface{}{
		{"KOLOM", "PENJELASAN", "CONTOH"},
		{"question_type", "Tipe soal: PG, ESSAY, MATCHING, HOTSPOT, AUDIO", "PG"},
		{"question_text", "Teks soal. Boleh mengandung HTML, LaTeX ($...$), atau tag <img>/<audio>", "Nilai $x^2$ adalah..."},
		{"media_url", "URL gambar/audio utama (opsional). Upload dulu ke CDN/Object Storage", "https://cdn.sekolah.id/img/soal1.png"},
		{"opt_a s/d opt_e", "Pilihan jawaban. Kosongkan untuk ESSAY", "Jakarta"},
		{"correct_option", "Kunci jawaban (A/B/C/D/E). Kosongkan untuk ESSAY", "C"},
		{"score", "Bobot nilai soal", "10"},
		{"rubric", "Rubrik penilaian khusus ESSAY (opsional)", "Sebutkan 3 unsur = 10 poin"},
		{"", "", ""},
		{"FORMAT KHUSUS:", "", ""},
		{"LaTeX (Rumus)", "Gunakan $...$ untuk inline, $$...$$ untuk block", "$\\frac{a}{b}$ atau $$\\int_0^1 x dx$$"},
		{"Gambar Inline", "Gunakan tag HTML <img> di question_text", "<img src='https://...' />"},
		{"Audio Inline", "Gunakan tag HTML <audio> di question_text", "<audio src='https://...' controls />"},
		{"Huruf Arab/Sunda", "Langsung ketik, sistem mendukung UTF-8", "مدرسة atau ᮞᮥᮔ᮪ᮓ"},
	}

	for rowIdx, row := range guides {
		for colIdx, val := range row {
			cell, _ := excelize.CoordinatesToCellName(colIdx+1, rowIdx+1)
			xls.SetCellValue(sheet2, cell, val)
			if rowIdx == 0 {
				xls.SetCellStyle(sheet2, cell, cell, headerStyle)
			}
		}
	}
	xls.SetColWidth(sheet2, "A", "A", 25)
	xls.SetColWidth(sheet2, "B", "B", 60)
	xls.SetColWidth(sheet2, "C", "C", 50)

	// ==========================================
	// RESPONSE: Stream file ke browser
	// ==========================================
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", "attachment; filename=template_bank_soal_cbt.xlsx")

	return xls.Write(c.Response().BodyWriter())
}

// Tambahkan route di RegisterRoutes:
// admin.Post("/questions/import", h.HandleImportQuestions)

func (h *CBTHandler) HandleImportQuestions(c *fiber.Ctx) error {
	examID := c.FormValue("exam_id")
	fileHeader, err := c.FormFile("file_soal")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "File tidak ditemukan"})
	}

	// Deteksi tipe file
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))

	file, _ := fileHeader.Open()
	defer file.Close()

	var count int
	var errImport error

	switch ext {
	case ".csv":
		count, errImport = h.examUC.ImportQuestionsFromCSV(c.Context(), examID, file)
	case ".xlsx", ".xls":
		count, errImport = h.examUC.ImportQuestionsFromExcel(c.Context(), examID, file)
	default:
		return c.Status(400).JSON(fiber.Map{"error": "Format file harus .csv atau .xlsx"})
	}

	if errImport != nil {
		return c.Status(500).JSON(fiber.Map{"error": errImport.Error()})
	}

	return c.JSON(fiber.Map{
		"message":        "Import berhasil",
		"format":         ext,
		"imported_count": count,
	})
}

type PasteQuestionRequest struct {
	ExamID    string `json:"exam_id"`
	Questions []struct {
		Text          string  `json:"text"`
		MediaURL      string  `json:"media_url,omitempty"`
		OptA          string  `json:"opt_a"`
		OptB          string  `json:"opt_b"`
		OptC          string  `json:"opt_c"`
		OptD          string  `json:"opt_d"`
		OptE          string  `json:"opt_e,omitempty"`
		CorrectOption string  `json:"correct_option"`
		QuestionType  string  `json:"question_type,omitempty"` // PG, ESSAY, CODING, dll
		Score         float64 `json:"score,omitempty"`
		Rubric        string  `json:"rubric,omitempty"`
	} `json:"questions"`
}

func (h *CBTHandler) HandleImportPaste(c *fiber.Ctx) error {
	var req PasteQuestionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format JSON tidak valid"})
	}

	if req.ExamID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "exam_id wajib diisi"})
	}

	if len(req.Questions) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Array questions kosong"})
	}

	// Konversi dari request struct ke domain.Question
	batch := make([]domain.Question, 0, len(req.Questions))
	for _, q := range req.Questions {
		if q.Text == "" {
			continue // Skip soal kosong
		}

		// Bangun JSON options
		optionsMap := map[string]string{
			"A": q.OptA,
			"B": q.OptB,
			"C": q.OptC,
			"D": q.OptD,
		}
		if q.OptE != "" {
			optionsMap["E"] = q.OptE
		}
		optionsJSON, _ := json.Marshal(optionsMap)

		qType := domain.TypePG
		if q.QuestionType != "" {
			qType = domain.QuestionType(strings.ToUpper(q.QuestionType))
		}

		score := q.Score
		if score == 0 {
			score = 10 // Default score
		}

		batch = append(batch, domain.Question{
			ExamID:        req.ExamID,
			QuestionType:  qType,
			QuestionText:  q.Text,
			MediaURL:      q.MediaURL,
			Options:       string(optionsJSON),
			CorrectOption: strings.ToUpper(q.CorrectOption),
			Score:         score,
			Rubric:        q.Rubric,
		})
	}

	// 🔥 Panggil method UseCase (bukan akses repo langsung!)
	count, err := h.examUC.ImportQuestionsFromPaste(c.Context(), req.ExamID, batch)
	if err != nil {
		log.Printf("[HANDLER] Import paste failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message":        "Import paste berhasil",
		"exam_id":        req.ExamID,
		"imported_count": count,
	})
}

// HandleGetTimer — server-side authoritative timer
func (h *CBTHandler) HandleGetTimer(c *fiber.Ctx) error {
	// Ambil dari JWT (middleware sudah set ini)
	participantID, _ := c.Locals("userID").(string)
	examID, _ := c.Locals("examID").(string)
	if participantID == "" || examID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Identity tidak valid"})
	}

	resp, err := h.examUC.CheckTimer(c.Context(), participantID, examID, h.sessionUC)
	if err != nil {
		// Tetap kirim timer info, hanya saja status = NOT_STARTED / EXPIRED
		if err == cbtUC.ErrExamNotStarted || err == cbtUC.ErrExamExpired || err == cbtUC.ErrExamNoSession {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":             err.Error(),
				"status":            resp.Status,
				"remaining_seconds": resp.RemainingSeconds,
				"server_time":       resp.ServerTime,
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(resp)
}

// HandleBatchAnswer — autosave batching
func (h *CBTHandler) HandleBatchAnswer(c *fiber.Ctx) error {
	participantID, _ := c.Locals("userID").(string)
	examID, _ := c.Locals("examID").(string)
	if participantID == "" || examID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Identity tidak valid"})
	}

	var req domain.AnswerBatchRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}
	if len(req.Answers) == 0 {
		return c.JSON(fiber.Map{"status": "noop", "accepted": 0})
	}

	// Timer guard — server authority
	if _, err := h.examUC.CheckTimer(c.Context(), participantID, examID, h.sessionUC); err != nil {
		if err == cbtUC.ErrExamExpired {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Waktu ujian habis. Jawaban tidak diterima.",
			})
		}
		if err == cbtUC.ErrExamNotStarted {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Ujian belum dimulai.",
			})
		}
	}

	if err := h.examUC.BatchSubmitAnswers(c.Context(), participantID, examID, req.Answers); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status":   "accepted",
		"accepted": len(req.Answers),
	})
}

// ============================================
// PHASE 5: Participant Exam List & History
// ============================================

// HandleGetActiveExams — daftar ujian yang eligible untuk peserta
// Identity dari JWT (middleware sudah set userID)
func (h *CBTHandler) HandleGetActiveExams(c *fiber.Ctx) error {
	participantID, _ := c.Locals("userID").(string)
	if participantID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Identity tidak valid"})
	}

	// Pakai examDB melalui examUC (tambahkan method passthrough) atau langsung
	exams, err := h.examUC.GetParticipantExams(c.Context(), participantID)
	if err != nil {
		log.Printf("[HANDLER] GetActiveExams: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Enrich dengan derived status (NOT_STARTED / ACTIVE / EXPIRED)
	now := time.Now()
	for i := range exams {
		p := &exams[i]
		start, _ := time.Parse(time.RFC3339, p.StartTime)
		end, _ := time.Parse(time.RFC3339, p.EndTime)
		switch {
		case p.ParticipantStat == "COMPLETED":
			p.SessionStatus = "COMPLETED"
		case now.Before(start):
			p.SessionStatus = "NOT_STARTED"
		case now.After(end):
			p.SessionStatus = "EXPIRED"
		default:
			p.SessionStatus = "ACTIVE"
		}
	}

	return c.JSON(fiber.Map{
		"status": "ok",
		"data":   exams,
	})
}

// HandleGetExamHistory — riwayat ujian peserta
func (h *CBTHandler) HandleGetExamHistory(c *fiber.Ctx) error {
	participantID, _ := c.Locals("userID").(string)
	if participantID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Identity tidak valid"})
	}

	history, err := h.examUC.GetParticipantHistory(c.Context(), participantID)
	if err != nil {
		log.Printf("[HANDLER] GetExamHistory: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "ok", "data": history})
}

// HandleVerifyToken — verifikasi token ujian (opsional, proctor gated)
// MVP: return valid=true selama JWT valid & exam_id di token cocok.
// Token fisik (6 huruf dari proctor) belum diimplementasi; akan disambung di PHASE 10
// jika UI admin untuk generate token proctor sudah ada.
func (h *CBTHandler) HandleVerifyToken(c *fiber.Ctx) error {
	participantID, _ := c.Locals("userID").(string)
	if participantID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Identity tidak valid"})
	}

	examID := c.Params("examId")
	if examID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "examId wajib di path"})
	}

	var body struct {
		Token string `json:"token"`
	}
	if err := c.BodyParser(&body); err != nil || body.Token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "token wajib di body"})
	}

	// 1. Cari session peserta untuk exam ini
	sess, err := h.sessionUC.GetParticipantSession(c.Context(), participantID, examID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if sess == nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Anda tidak terdaftar di ujian ini",
		})
	}

	// 2. Cek window waktu
	now := time.Now()
	if now.Before(sess.StartTime) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":  "Ujian belum dimulai",
			"status": "NOT_STARTED",
		})
	}
	if now.After(sess.EndTime) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":  "Waktu ujian sudah habis",
			"status": "EXPIRED",
		})
	}

	// 3. Cek sesi status (jangan sampai CLOSED)
	if sess.Status == "CLOSED" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Sesi ujian sudah ditutup"})
	}

	// 4. Verify token proctor
	valid, err := h.tokenUC.Verify(c.Context(), sess.ID, body.Token)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if !valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"valid": false,
			"error": "Token tidak valid atau sudah expired",
		})
	}

	// 5. Terbitkan JWT-B dengan exam_id
	jwtB, err := auth.GenerateTokenFull(participantID, "PARTICIPANT", examID, "", 6*time.Hour)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal generate JWT-B"})
	}

	return c.JSON(fiber.Map{
		"valid":      true,
		"token":      jwtB, // ← JWT-B
		"session_id": sess.ID,
		"exam_id":    examID,
		"message":    "Token terverifikasi",
	})
}

// HandleGetCurrentToken — proctor view token aktif
func (h *CBTHandler) HandleGetCurrentToken(c *fiber.Ctx) error {
	sessionID := c.Params("sessionId")
	if sessionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "sessionId wajib"})
	}
	t, err := h.tokenUC.GetCurrent(c.Context(), sessionID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if t == nil {
		return c.JSON(fiber.Map{"token": "", "message": "Belum ada token aktif"})
	}
	return c.JSON(fiber.Map{
		"token":             t.Token,
		"valid_from":        t.ValidFrom,
		"valid_until":       t.ValidUntil,
		"remaining_seconds": int64(time.Until(t.ValidUntil).Seconds()),
	})
}

// HandleRotateTokenManual — proctor rotate manual
func (h *CBTHandler) HandleRotateTokenManual(c *fiber.Ctx) error {
	sessionID := c.Params("sessionId")
	adminID, _ := c.Locals("userID").(string)
	t, err := h.tokenUC.Rotate(c.Context(), sessionID, adminID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(t)
}

// HandleGetTenantConfig — stub single-tenant.
// Multi-tenant SaaS akan diimplementasi di PHASE 10.
func (h *CBTHandler) HandleGetTenantConfig(c *fiber.Ctx) error {
	slug := c.Params("slug")
	return c.JSON(fiber.Map{
		"slug":         slug,
		"school_name":  "CBT Engine",
		"logo_url":     "",
		"is_suspended": false,
	})
}

// HandleListSchools — stub single-tenant.
// Multi-tenant SaaS akan diimplementasi di PHASE 10.
func (h *CBTHandler) HandleListSchools(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status": "ok",
		"data": []fiber.Map{
			{
				"slug":       "default",
				"name":       "CBT Engine",
				"logo_url":   "",
				"is_active":  true,
				"portal_url": "/auth/participant",
			},
		},
	})
}

// ============================================
// PHASE D1: Admin credential management
// ============================================

type GenerateCredentialsRequest struct {
	ExamID    string `json:"exam_id"`
	ValidDays int    `json:"valid_days"` // 0 = permanen
	Overwrite bool   `json:"overwrite"`  // true = regenerate meski sudah ada
}

func (h *CBTHandler) HandleGenerateCredentials(c *fiber.Ctx) error {
	var req GenerateCredentialsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}
	if req.ExamID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "exam_id wajib"})
	}

	adminID, _ := c.Locals("userID").(string)

	list, err := h.credentialsUC.GenerateForExam(c.Context(), req.ExamID, adminID, req.ValidDays)
	if err != nil {
		log.Printf("[HANDLER] GenerateCredentials: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status": "ok",
		"count":  len(list),
		"data":   list, // ⚠️ password plaintext — kirim sekali, tidak disimpan di response log
	})
}

func (h *CBTHandler) HandleViewCredentials(c *fiber.Ctx) error {
	examID := c.Query("exam_id")
	if examID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "exam_id wajib"})
	}

	list, err := h.credentialsUC.ViewByExamID(c.Context(), examID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "ok", "data": list})
}

// HandleHeartbeat — keepalive proctoring
func (h *CBTHandler) HandleHeartbeat(c *fiber.Ctx) error {
	participantID, _ := c.Locals("userID").(string)
	examID, _ := c.Locals("examID").(string)
	if participantID == "" || examID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Identity tidak valid"})
	}

	// Cek banned di Redis (via proctoring repo)
	if h.proctoringUC != nil {
		// ... opsional: cek banned
	}
	return c.JSON(fiber.Map{"status": "alive"})
}

// HandleTelemetry — proctoring events
func (h *CBTHandler) HandleTelemetry(c *fiber.Ctx) error {
	participantID, _ := c.Locals("userID").(string)
	examID, _ := c.Locals("examID").(string)
	if participantID == "" || examID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Identity tidak valid"})
	}

	var body struct {
		EventType string `json:"event_type"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}

	// Return action default (WARN). Force submit logic di D2+ / proctoring polish
	return c.JSON(fiber.Map{
		"status": "recorded",
		"action": "NONE",
		"event":  body.EventType,
	})
}

// HandleListSessions — proctor panel: list sesi + status token
func (h *CBTHandler) HandleListSessions(c *fiber.Ctx) error {
	examID := c.Query("exam_id")
	activeOnly := c.Query("active_only") == "true"

	if h.sessionUC == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Session repo belum siap",
		})
	}

	list, err := h.sessionUC.ListSessions(c.Context(), examID, activeOnly)
	if err != nil {
		log.Printf("[HANDLER] ListSessions: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status": "ok",
		"data":   list,
		"count":  len(list),
	})
}
