package usecase

import (
	"cbt-engine-service/internal/cbt/domain"
	"cbt-engine-service/internal/cbt/repository"
	"cbt-engine-service/internal/cbt/repository/sqlite"
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
	"golang.org/x/sync/singleflight"
)

type ExamUseCase struct {
	questionRepo repository.QuestionRepository
	answerRepo   repository.AnswerRepository
	resultRepo   repository.ResultRepository
	gradingQueue repository.GradingQueueRepository
	// Singleflight & In-Memory Cache (Tetap dipertahankan untuk hemat RAM & CPU)
	sfGroup         singleflight.Group
	mu              sync.RWMutex
	activeQuestions map[string][]domain.Question
}

// Constructor sekarang sangat bersih, hanya menerima interface repository
func NewExamUseCase(
	qRepo repository.QuestionRepository,
	aRepo repository.AnswerRepository,
	rRepo repository.ResultRepository,
	gQueue repository.GradingQueueRepository,
) *ExamUseCase {
	return &ExamUseCase{
		questionRepo:    qRepo,
		answerRepo:      aRepo,
		resultRepo:      rRepo,
		gradingQueue:    gQueue,
		activeQuestions: make(map[string][]domain.Question),
	}
}

// StartExam dipanggil saat peserta klik "Mulai Ujian".
// Asumsi: User SUDAH divalidasi oleh Middleware JWT sebelum masuk ke sini.
func (uc *ExamUseCase) StartExam(ctx context.Context, participantID, examID string) ([]domain.Question, error) {
	// 1. Ambil soal menggunakan Singleflight + In-Memory Cache
	questions, err := uc.getQuestionsWithSingleflight(ctx, examID)
	if err != nil {
		return nil, err
	}

	// 2. Sembunyikan kunci jawaban sebelum dikirim ke frontend
	sanitizedQuestions := make([]domain.Question, len(questions))
	for i, q := range questions {
		sanitizedQuestions[i] = q
		sanitizedQuestions[i].CorrectOption = "" // Kosongkan jawaban benar
	}

	return sanitizedQuestions, nil
}

// getQuestionsWithSingleflight (Logika Singleflight tetap sama)
func (uc *ExamUseCase) getQuestionsWithSingleflight(ctx context.Context, examID string) ([]domain.Question, error) {
	uc.mu.RLock()
	if qs, ok := uc.activeQuestions[examID]; ok {
		uc.mu.RUnlock()
		return qs, nil
	}
	uc.mu.RUnlock()

	result, err, _ := uc.sfGroup.Do(examID, func() (interface{}, error) {
		uc.mu.RLock()
		if qs, ok := uc.activeQuestions[examID]; ok {
			uc.mu.RUnlock()
			return qs, nil
		}
		uc.mu.RUnlock()

		log.Printf("[SINGLEFLIGHT] Fetching questions for exam %s...", examID)

		// Memanggil interface QuestionRepository
		questions, err := uc.questionRepo.GetQuestionsByExamID(examID)
		if err != nil {
			return nil, err
		}

		uc.mu.Lock()
		uc.activeQuestions[examID] = questions
		uc.mu.Unlock()

		return questions, nil
	})

	if err != nil {
		return nil, err
	}
	return result.([]domain.Question), nil
}

// SESUDAH — konsisten dengan BatchSubmitAnswers
func (uc *ExamUseCase) SubmitAnswer(ctx context.Context, participantID, examID, questionID, answer string) error {
	return uc.answerRepo.SaveAnswer(participantID, examID, domain.ParticipantAnswer{
		ParticipantID: participantID,
		ExamID:        examID,
		QuestionID:    questionID,
		Answer:        answer,
		Timestamp:     time.Now().Unix(),
	})
}

// FinishExam dipanggil saat waktu habis atau peserta klik "Kumpulkan"
func (uc *ExamUseCase) FinishExam(ctx context.Context, participantID, examID string) (*domain.ExamResult, error) {
	answers, err := uc.answerRepo.GetAnswers(participantID, examID)
	if err != nil {
		return nil, fmt.Errorf("gagal ambil jawaban: %w", err)
	}
	questions, err := uc.getQuestionsWithSingleflight(ctx, examID)
	if err != nil {
		return nil, fmt.Errorf("gagal ambil soal: %w", err)
	}

	var (
		totalScore       float64
		maxPossibleScore float64
		correctCount     int
		essayCount       int
	)

	for _, q := range questions {
		maxPossibleScore += q.Score

		ans, hasAnswer := answers[q.ID]
		if !hasAnswer {
			if q.QuestionType == domain.TypeEssay {
				essayCount++
			}
			continue
		}

		score := uc.gradeAnswer(q, ans)
		if score == -1 {
			// essay / coding menunggu review manual
			essayCount++
			continue
		}
		totalScore += score
		if score >= q.Score {
			correctCount++ // untuk PG, score penuh = benar
		}
	}

	// finalScore = persentase terhadap total yang BISA dinilai otomatis
	// Jika ada essay, kita hitung terhadap max soal NON-essay agar tidak unfair
	var finalScore float64
	nonEssayMax := maxPossibleScore
	if essayCount > 0 {
		// kurangi bobot essay dari denominator agar skor tidak "turun" sebelum essay dinilai
		for _, q := range questions {
			if q.QuestionType == domain.TypeEssay {
				nonEssayMax -= q.Score
			}
		}
	}
	if nonEssayMax > 0 {
		finalScore = (totalScore / nonEssayMax) * 100
	}

	result := &domain.ExamResult{
		ParticipantID:  participantID,
		ExamID:         examID,
		TotalQuestions: len(questions),
		CorrectAnswers: correctCount, // ← FIXED: jumlah soal benar, bukan totalScore
		FinalScore:     finalScore,
		Status:         "SUBMITTED",
		SubmittedAt:    time.Now(),
	}
	if essayCount > 0 {
		result.Status = "NEEDS_REVIEW"
	}

	if err := uc.resultRepo.SaveResult(result); err != nil {
		return nil, fmt.Errorf("gagal simpan hasil: %w", err)
	}
	return result, nil
}

// ImportQuestionsFromCSV membaca file CSV secara streaming dan insert bertahap
func (uc *ExamUseCase) ImportQuestionsFromCSV(ctx context.Context, examID string, file io.Reader) (int, error) {
	reader := csv.NewReader(file)
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	// 1. Baca Header
	header, err := reader.Read()
	if err != nil {
		return 0, fmt.Errorf("gagal membaca header CSV: %w", err)
	}

	colMap := map[string]int{}
	for i, col := range header {
		colMap[strings.ToLower(strings.TrimSpace(col))] = i
	}

	// 2. Streaming Baris & Batching
	batch := make([]domain.Question, 0, 200) // Batch size 200
	totalInserted := 0
	lineNum := 1

	for {
		lineNum++
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}

		// Ambil data dari kolom
		qText := getCol(record, colMap, "question_text")
		if qText == "" {
			continue
		} // Lewati baris kosong

		// Rangkai Opsi menjadi JSON String
		optionsMap := map[string]string{
			"A": getCol(record, colMap, "opt_a"),
			"B": getCol(record, colMap, "opt_b"),
			"C": getCol(record, colMap, "opt_c"),
			"D": getCol(record, colMap, "opt_d"),
		}
		optionsJSON, _ := json.Marshal(optionsMap)

		q := domain.Question{
			ExamID:        examID,
			QuestionText:  qText,
			MediaURL:      getCol(record, colMap, "media_url"),
			Options:       string(optionsJSON),
			CorrectOption: strings.ToUpper(getCol(record, colMap, "correct_option")),
		}

		batch = append(batch, q)

		// 3. Jika batch penuh, insert ke DB dan RESET SLICE (Hemat RAM)
		if len(batch) >= 200 {
			if err := uc.questionRepo.BatchInsertQuestions(ctx, batch); err != nil {
				return totalInserted, fmt.Errorf("gagal insert batch di baris %d: %w", lineNum, err)
			}
			totalInserted += len(batch)
			batch = batch[:0] // 🔥 TRIK HEMAT RAM: Reset length ke 0
		}
	}

	// 4. Insert sisa data di batch terakhir
	if len(batch) > 0 {
		if err := uc.questionRepo.BatchInsertQuestions(ctx, batch); err != nil {
			return totalInserted, fmt.Errorf("gagal insert batch terakhir: %w", err)
		}
		totalInserted += len(batch)
	}

	// 5. 🔥 PENTING: Hapus In-Memory Cache untuk ExamID ini agar Singleflight mengambil data baru dari SQLite
	uc.mu.Lock()
	delete(uc.activeQuestions, examID)
	uc.mu.Unlock()

	return totalInserted, nil
}

// ImportQuestionsFromExcel membaca file Excel secara STREAMING (hemat RAM)
func (uc *ExamUseCase) ImportQuestionsFromExcel(ctx context.Context, examID string, file io.Reader) (int, error) {
	// 🔥 PENTING: Gunakan OpenReader dengan StreamSheet untuk hemat RAM
	// File tidak dimuat seluruhnya ke memory
	xls, err := excelize.OpenReader(file)
	if err != nil {
		return 0, fmt.Errorf("gagal membuka file Excel: %w", err)
	}
	defer xls.Close()

	sheetName := xls.GetSheetName(0) // Ambil sheet pertama
	stream, err := xls.Rows(sheetName)
	if err != nil {
		return 0, fmt.Errorf("gagal membaca sheet: %w", err)
	}
	defer stream.Close()

	// 1. Baca Header (baris pertama)
	if !stream.Next() {
		return 0, fmt.Errorf("file Excel kosong")
	}
	headerRow, err := stream.Columns()
	if err != nil {
		return 0, err
	}

	colMap := map[string]int{}
	for i, col := range headerRow {
		colMap[strings.ToLower(strings.TrimSpace(col))] = i
	}

	// Validasi kolom wajib
	for _, required := range []string{"question_text", "opt_a", "opt_b", "opt_c", "opt_d", "correct_option"} {
		if _, ok := colMap[required]; !ok {
			return 0, fmt.Errorf("kolom '%s' wajib ada di header Excel", required)
		}
	}

	// 2. Streaming Baris & Batching (Pola sama dengan CSV)
	batch := make([]domain.Question, 0, 200)
	totalInserted := 0
	lineNum := 1

	for stream.Next() {
		lineNum++
		row, err := stream.Columns()
		if err != nil {
			continue
		}

		qText := getCol(row, colMap, "question_text")
		if qText == "" {
			continue
		}

		// Rangkai opsi jadi JSON
		optionsMap := map[string]string{
			"A": getCol(row, colMap, "opt_a"),
			"B": getCol(row, colMap, "opt_b"),
			"C": getCol(row, colMap, "opt_c"),
			"D": getCol(row, colMap, "opt_d"),
		}
		optionsJSON, _ := json.Marshal(optionsMap)

		q := domain.Question{
			ExamID:        examID,
			QuestionText:  qText,
			MediaURL:      getCol(row, colMap, "media_url"),
			Options:       string(optionsJSON),
			CorrectOption: strings.ToUpper(getCol(row, colMap, "correct_option")),
		}

		batch = append(batch, q)

		if len(batch) >= 200 {
			if err := uc.questionRepo.BatchInsertQuestions(ctx, batch); err != nil {
				return totalInserted, err
			}
			totalInserted += len(batch)
			batch = batch[:0] // 🔥 Reset slice, reuse underlying array
		}
	}

	// Insert sisa batch
	if len(batch) > 0 {
		uc.questionRepo.BatchInsertQuestions(ctx, batch)
		totalInserted += len(batch)
	}

	// Invalidate cache
	uc.mu.Lock()
	delete(uc.activeQuestions, examID)
	uc.mu.Unlock()

	return totalInserted, nil
}

// ImportQuestionsFromPaste menerima slice Question dari frontend dan insert ke DB
// Digunakan untuk import cepat 10-50 soal tanpa file
func (uc *ExamUseCase) ImportQuestionsFromPaste(ctx context.Context, examID string, questions []domain.Question) (int, error) {
	if len(questions) == 0 {
		return 0, nil
	}

	// Validasi batas maksimal (cegah abuse)
	if len(questions) > 500 {
		return 0, fmt.Errorf("maksimal 500 soal per paste, Anda mengirim %d", len(questions))
	}

	// Inject examID ke setiap soal (jaga-jaga jika frontend lupa)
	for i := range questions {
		questions[i].ExamID = examID

		// Generate ID jika kosong
		if questions[i].ID == "" {
			questions[i].ID = uuid.NewString()
		}

		// Default type jika kosong
		if questions[i].QuestionType == "" {
			questions[i].QuestionType = domain.TypePG
		}

		// Default score jika 0
		if questions[i].Score == 0 {
			questions[i].Score = 10
		}
	}

	// Batch insert (reuse logic yang sama dengan CSV/Excel)
	// Karena data sudah di-memory, kita bisa langsung insert semua
	// Tapi tetap pakai batch 200 untuk konsistensi & safety
	totalInserted := 0
	batchSize := 200

	for i := 0; i < len(questions); i += batchSize {
		end := i + batchSize
		if end > len(questions) {
			end = len(questions)
		}

		batch := questions[i:end]
		if err := uc.questionRepo.BatchInsertQuestions(ctx, batch); err != nil {
			return totalInserted, fmt.Errorf("gagal insert batch ke-%d: %w", (i/batchSize)+1, err)
		}
		totalInserted += len(batch)
	}

	// 🔥 Invalidate cache agar soal baru langsung tersedia
	uc.mu.Lock()
	delete(uc.activeQuestions, examID)
	uc.mu.Unlock()

	return totalInserted, nil
}

func (uc *ExamUseCase) gradeAnswer(q domain.Question, ans domain.ParticipantAnswer) float64 {
	switch q.QuestionType {
	case domain.TypePG, domain.TypeAudio:
		// Grading sederhana: cocok = full score
		if ans.Answer == q.CorrectOption {
			return q.Score
		}
		return 0

	case domain.TypeMatching:
		// Grading matching: bandingkan array pasangan
		var opts struct {
			CorrectPairs [][]int `json:"correct_pairs"`
		}
		json.Unmarshal([]byte(q.Options), &opts)

		var userPairs [][]int
		json.Unmarshal([]byte(ans.Answer), &userPairs)

		// Hitung berapa pair yang benar
		correctCount := 0
		for _, up := range userPairs {
			for _, cp := range opts.CorrectPairs {
				if up[0] == cp[0] && up[1] == cp[1] {
					correctCount++
					break
				}
			}
		}
		return q.Score * float64(correctCount) / float64(len(opts.CorrectPairs))

	case domain.TypeHotspot:
		// Grading hotspot: cocok ID zone
		if ans.Answer == q.CorrectOption {
			return q.Score
		}
		return 0

	case domain.TypeEssay:
		// Essay TIDAK dinilai di sini.
		// Dilempar ke Auto-Grading Worker via Redis queue
		uc.enqueueEssayGrading(q, ans)
		return -1 // -1 = "belum dinilai"

	case domain.TypeCoding:
		return uc.gradeCoding(q, ans)
	default:
		return 0
	}
}

func (uc *ExamUseCase) enqueueEssayGrading(q domain.Question, ans domain.ParticipantAnswer) {
	payload := domain.EssayGradingPayload{
		ParticipantID:   ans.ParticipantID,
		ExamID:          q.ExamID,
		QuestionID:      q.ID,
		QuestionType:    string(q.QuestionType),
		AnswerText:      ans.Answer,
		Rubric:          q.Rubric,
		MaxScore:        q.Score,
		CodingCategory:  string(q.CodingCategory),
		ProgrammingLang: string(q.ProgrammingLang),
	}

	// 🔥 GUNAKAN INTERFACE, BUKAN redisClient LANGSUNG
	if err := uc.gradingQueue.EnqueueEssayGrading(payload); err != nil {
		log.Printf("[EXAM UC] Gagal enqueue essay grading: %v", err)
	}
}

func (uc *ExamUseCase) gradeCoding(q domain.Question, ans domain.ParticipantAnswer) float64 {
	if q.CodingMode == domain.CodingModeAnalysis {
		// Mode A: PG biasa, cocokkan jawaban dengan correct_option
		if ans.Answer == q.CorrectOption {
			return q.Score
		}
		return 0
	}

	if q.CodingMode == domain.CodingModeWriting {
		// Mode B: Essay koding, lempar ke worker untuk dinilai AI/manual
		uc.enqueueCodingGrading(q, ans)
		return -1 // -1 = "belum dinilai"
	}

	return 0
}
func (uc *ExamUseCase) enqueueCodingGrading(q domain.Question, ans domain.ParticipantAnswer) {
	payload := domain.EssayGradingPayload{
		ParticipantID:   ans.ParticipantID,
		ExamID:          q.ExamID,
		QuestionID:      q.ID,
		QuestionType:    string(q.QuestionType),
		AnswerText:      ans.Answer,
		Rubric:          q.Rubric,
		MaxScore:        q.Score,
		CodingCategory:  string(q.CodingCategory),
		ProgrammingLang: string(q.ProgrammingLang),
	}

	// 🔥 GUNAKAN INTERFACE, BUKAN redisClient LANGSUNG
	// Method EnqueueEssayGrading bisa dipakai untuk koding juga karena payload sudah kompatibel
	if err := uc.gradingQueue.EnqueueEssayGrading(payload); err != nil {
		log.Printf("[EXAM UC] Gagal enqueue coding grading: %v", err)
	}
}

// Helper function untuk mengambil nilai kolom berdasarkan nama header
func getCol(record []string, colMap map[string]int, colName string) string {
	idx, ok := colMap[colName]
	if !ok || idx >= len(record) {
		return ""
	}
	return strings.TrimSpace(record[idx])
}

// ============================================
// TIMER & BATCHING (Phase 3)
// ============================================

var (
	ErrExamNotStarted = errors.New("exam_not_started")
	ErrExamExpired    = errors.New("exam_expired")
	ErrExamNoSession  = errors.New("no_active_session")
)

// sessionRepo disuntikkan via setter agar backward-compatible dengan constructor lama
type sessionRepoSetter interface {
	SetSessionRepository(repo repository.SessionRepository)
}

// CheckTimer — validasi apakah peserta boleh akses ujian saat ini
// Mengembalikan (status, remaining_seconds, error)
func (uc *ExamUseCase) CheckTimer(ctx context.Context, participantID, examID string, sessRepo repository.SessionRepository) (domain.TimerResponse, error) {
	now := time.Now()

	if sessRepo == nil {
		// Fallback: jika belum di-wire, anggap ACTIVE dengan 1 jam. Untuk backward-compat.
		return domain.TimerResponse{
			Status:           domain.ExamActive,
			RemainingSeconds: 3600,
			ServerTime:       now.Unix(),
		}, nil
	}

	sess, err := sessRepo.GetParticipantSession(ctx, participantID, examID)
	if err != nil {
		return domain.TimerResponse{}, err
	}
	if sess == nil {
		return domain.TimerResponse{}, ErrExamNoSession
	}

	status := sess.DeriveStatus(now, false)
	resp := domain.TimerResponse{
		Status:           status,
		RemainingSeconds: sess.RemainingSeconds(now),
		ServerTime:       now.Unix(),
		SessionID:        sess.ID,
	}

	switch status {
	case domain.ExamNotStarted:
		return resp, ErrExamNotStarted
	case domain.ExamExpired:
		return resp, ErrExamExpired
	}
	return resp, nil
}

// BatchSubmitAnswers — simpan banyak jawaban sekaligus (Redis HSet via repo)
// Idempotent: aman dipanggil berulang dengan payload sama.
func (uc *ExamUseCase) BatchSubmitAnswers(ctx context.Context, participantID, examID string, items []domain.AnswerBatchItem) error {
	if len(items) == 0 {
		return nil
	}
	now := time.Now().Unix()
	batch := make([]domain.ParticipantAnswer, 0, len(items))
	for _, it := range items {
		if it.QuestionID == "" {
			continue
		}
		batch = append(batch, domain.ParticipantAnswer{
			ParticipantID: participantID,
			ExamID:        examID,
			QuestionID:    it.QuestionID,
			Answer:        it.Answer,
			Timestamp:     now,
		})
	}
	if len(batch) == 0 {
		return nil
	}
	return uc.answerRepo.SaveAnswersBatch(participantID, examID, batch)
}

// Passthrough untuk akses ParticipantExam & History dari examDB
// (examDB juga mengimplementasi interface ini — lihat exam_db.go)

// GetParticipantExams — daftar ujian peserta
func (uc *ExamUseCase) GetParticipantExams(ctx context.Context, participantID string) ([]sqlite.ParticipantExam, error) {
	db, ok := uc.questionRepo.(*sqlite.ExamDB)
	if !ok {
		return nil, errors.New("examDB bukan tipe yang diharapkan")
	}
	return db.GetParticipantExams(ctx, participantID)
}

// GetParticipantHistory — riwayat ujian peserta
func (uc *ExamUseCase) GetParticipantHistory(ctx context.Context, participantID string) ([]map[string]any, error) {
	db, ok := uc.resultRepo.(*sqlite.ExamDB)
	if !ok {
		return nil, errors.New("examDB bukan tipe yang diharapkan")
	}
	return db.GetParticipantHistory(ctx, participantID)
}
