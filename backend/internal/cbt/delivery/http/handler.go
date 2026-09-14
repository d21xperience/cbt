// internal/cbt/delivery/http/handler.go
package http

import (
	archiveUsecase "cbt-engine-service/internal/archive/usecase"
	"cbt-engine-service/internal/cbt/domain"
	cbtUc "cbt-engine-service/internal/cbt/usecase"
	proctoringUsecase "cbt-engine-service/internal/proctoring/usecase"
	schedulingDomain "cbt-engine-service/internal/scheduling/domain"
	schedulingUsecase "cbt-engine-service/internal/scheduling/usecase"
	"cbt-engine-service/pkg/auth"
	"encoding/json"
	"fmt"
	"log"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/xuri/excelize/v2"
)

type CBTHandler struct {
	schedulingUC *schedulingUsecase.SchedulingUseCase
	examUC       *cbtUc.ExamUseCase
	archiveUC    *archiveUsecase.ArchiveUseCase
	proctoringUC *proctoringUsecase.ProctoringUseCase
}
type ExternalImportRequest struct {
	ExamID   string                                 `json:"exam_id"`
	Students []schedulingDomain.EligibleParticipant `json:"students"` // Atau parse dari CSV
}

type AdminLoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func NewCBTHandler(sched *schedulingUsecase.SchedulingUseCase, exam *cbtUc.ExamUseCase, arch *archiveUsecase.ArchiveUseCase, proc *proctoringUsecase.ProctoringUseCase) *CBTHandler {
	return &CBTHandler{
		schedulingUC: sched,
		examUC:       exam,
		archiveUC:    arch,
		proctoringUC: proc,
	}
}

func (h *CBTHandler) RegisterRoutes(app *fiber.App) {
	// ADMIN / MANAGEMENT ENDPOINTS
	api := app.Group("/api")
	admin := api.Group("/admin")
	admin.Post("/sync", h.HandleSync)
	admin.Post("/session", h.HandleCreateSession)
	admin.Post("/archive", h.HandleArchive)

	// PARTICIPANT / EXAM ENDPOINTS
	exam := api.Group("/exam")
	exam.Post("/login", h.HandleLogin)
	exam.Post("/start", h.HandleStartExam)
	exam.Post("/answer", h.HandleSubmitAnswer)
	exam.Post("/submit", h.HandleFinishExam)
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

func (h *CBTHandler) HandleCreateSession(c *fiber.Ctx) error {
	// TODO: Implementasikan logika pembuatan sesi di repository SQLite.
	// Untuk testing Insomnia, kita return mock success.
	return c.JSON(fiber.Map{
		"message": "Sesi ujian berhasil dibuat (Mock)",
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

type LoginRequest struct {
	NISN           string `json:"nisn"`
	PembelajaranID string `json:"pembelajaran_id"` // Acts as ExamID for CBT
}

func (h *CBTHandler) HandleLogin(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	resp, err := h.schedulingUC.ValidateForExam(c.Context(), req.NISN, req.PembelajaranID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	// Generate dummy token for session tracking
	token := fmt.Sprintf("CBT-TOKEN-%d-%s", time.Now().Unix(), resp.ParticipantID)

	return c.JSON(fiber.Map{
		"status":         "authorized",
		"participant_id": resp.ParticipantID,
		"name":           resp.Name,
		"exam_id":        req.PembelajaranID,
		"token":          token,
	})
}

type StartExamRequest struct {
	ParticipantID string `json:"participant_id"`
	ExamID        string `json:"exam_id"`
}

func (h *CBTHandler) HandleStartExam(c *fiber.Ctx) error {
	var req StartExamRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	questions, err := h.examUC.StartExam(c.Context(), req.ParticipantID, req.ExamID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status":    "exam_started",
		"questions": questions,
	})
}

type SubmitAnswerRequest struct {
	ParticipantID string `json:"participant_id"`
	ExamID        string `json:"exam_id"`
	QuestionID    string `json:"question_id"`
	Answer        string `json:"answer"`
}

func (h *CBTHandler) HandleSubmitAnswer(c *fiber.Ctx) error {
	var req SubmitAnswerRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	err := h.examUC.SubmitAnswer(c.Context(), req.ParticipantID, req.ExamID, req.QuestionID, req.Answer)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan jawaban"})
	}

	return c.JSON(fiber.Map{"status": "answer_saved"})
}

type FinishExamRequest struct {
	ParticipantID string `json:"participant_id"`
	ExamID        string `json:"exam_id"`
}

func (h *CBTHandler) HandleFinishExam(c *fiber.Ctx) error {
	var req FinishExamRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	result, err := h.examUC.FinishExam(c.Context(), req.ParticipantID, req.ExamID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyelesaikan ujian"})
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
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	// Mock validasi (Ganti dengan query DB di produksi)
	if req.Username != "admin" || req.Password != "admin123" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Username/Password salah"})
	}

	// Generate JWT Admin (Berlaku 12 Jam)
	token, err := auth.GenerateToken("admin-001", "ADMIN", "", 12*time.Hour)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal generate token"})
	}

	return c.JSON(fiber.Map{"token": token, "role": "ADMIN"})
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

// Update HandleLogin (Peserta)
// func (h *CBTHandler) HandleLogin(c *fiber.Ctx) error {
// 	var req LoginRequest
// 	if err := c.BodyParser(&req); err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
// 	}

// 	resp, err := h.schedulingUC.ValidateForExam(c.Context(), req.ID, req.ExamIdentifier)
// 	if err != nil {
// 		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
// 	}

// 	// Generate JWT Peserta (Berlaku 6 Jam - Aman untuk durasi ujian + buffer)
// 	token, err := auth.GenerateToken(resp.ParticipantID, "PARTICIPANT", req.ExamIdentifier, 6*time.Hour)
// 	if err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal generate token"})
// 	}

// 	return c.JSON(fiber.Map{
// 		"status":         "authorized",
// 		"participant_id": resp.ParticipantID,
// 		"name":           resp.Name,
// 		"token":          token, // Token JWT asli
// 	})
// }

// Route: POST /api/admin/participants/import-external
// func (h *CBTHandler) HandleImportExternal(c *fiber.Ctx) error {
// 	// 1. Parse JSON atau CSV (Disarankan CSV untuk data massal)
// 	var req ExternalImportRequest
// 	if err := c.BodyParser(&req); err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format tidak valid"})
// 	}

// 	// 2. Validasi ExamID harus ada
// 	// ...

// 	// 3. Inject ExamID ke setiap siswa
// 	for i := range req.Students {
// 		req.Students[i].ExamID = req.ExamID
// 		req.Students[i].Source = "EXTERNAL"
// 	}

// 	// 4. Batch Insert ke SQLite
// 	count, err := h.schedulingUC.ImportExternalParticipants(c.Context(), req.Students)
// 	if err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
// 	}

// 	return c.JSON(fiber.Map{
// 		"message":        "Import peserta eksternal berhasil",
// 		"imported_count": count,
// 	})
// }
