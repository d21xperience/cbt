// package domain

// import (
// 	"context"
// 	"time"
// )

// type Question struct {
// 	ID            string `json:"id"`
// 	ExamID        string `json:"exam_id"`
// 	QuestionText  string `json:"question_text"`
// 	OptionA       string `json:"option_a"`
// 	OptionB       string `json:"option_b"`
// 	OptionC       string `json:"option_c"`
// 	OptionD       string `json:"option_d"`
// 	OptionE       string `json:"option_e"`
// 	ImageUrl      string `json:"image_url"`
// 	AudioUrl      string `json:"audio_url"`
// 	CorrectOption string `json:"-"` // Sembunyikan kunci jawaban dari siswa saat fetching soal
// }

// type TokenVerificationRequest struct {
// 	ExamID string `json:"exam_id"`
// 	Token  string `json:"token"`
// }

// // SaveAnswerRequest payload dari Quasar saat siswa klik pilihan ganda
// type SaveAnswerRequest struct {
// 	StudentID    string `json:"student_id"`
// 	ExamID       string `json:"exam_id"`
// 	QuestionID   string `json:"question_id"`
// 	ChosenAnswer string `json:"chosen_answer"` // 'A', 'B', 'C', or 'D'
// }

// type SubmitExamRequest struct {
// 	StudentID string `json:"student_id"`
// 	ExamID    string `json:"exam_id"`
// }

// type UpdateStatusRequest struct {
// 	StudentID string `json:"student_id"`
// 	ExamID    string `json:"exam_id"`
// 	Status    string `json:"status"` // 'CONNECTED', 'DISCONNECTED', 'SUBMITTED'
// }

// type StudentStatusResponse struct {
// 	StudentID string `json:"student_id"`
// 	Status    string `json:"status"`
// 	LastSeen  string `json:"last_seen"`
// }

// // CbtPostgresRepository mengurusi data master soal dan nilai permanen
// type CbtPostgresRepository interface {
// 	GetQuestionsByExamID(ctx context.Context, examID string) ([]Question, error)
// 	GetCorrectAnswers(ctx context.Context, examID string) (map[string]string, error) // map[QuestionID]CorrectOption
// 	SaveFinalResult(ctx context.Context, studentID, examID string, score float64) error
// }

// 	// SEGMEN BARU: Manajemen Token di Redis
// 	SetExamToken(ctx context.Context, examID string, token string, duration time.Duration) error
// 	GetExamToken(ctx context.Context, examID string) (string, error)
// 	// FITUR BARU: Melacak Status Peserta di Redis
// 	SetStudentStatus(ctx context.Context, examID, studentID, status string) error
// 	GetAllStudentsStatus(ctx context.Context, examID string) (map[string]string, error) // map[StudentID]Status
// }

// type CbtUsecase interface {
// 	FetchExamQuestions(ctx context.Context, examID string) ([]Question, error)
// 	SubmitAnswerRealtime(ctx context.Context, req *SaveAnswerRequest) error
// 	SubmitExamFinal(ctx context.Context, req *SubmitExamRequest) (float64, error) // Mengembalikan nilai akhir

// 	// SEGMEN BARU: Bisnis Logika Token
// 	GenerateAndSaveToken(ctx context.Context, examID string, minutesDuration int) (string, error)
// 	VerifyExamToken(ctx context.Context, examID string, inputToken string) (bool, error)

//		// FITUR BARU: Logika Status Peserta
//		UpdateStudentStatus(ctx context.Context, examID, studentID, status string) error
//		GetMonitorDashboard(ctx context.Context, examID string) (map[string]string, error)
//	}
//
// internal/domain/exam.go
package domain

import (
	"context"
	"time"
)

// Question merepresentasikan soal ujian yang disimpan di SQLite
// type Question struct {
// 	ID            string    `json:"id"`
// 	ExamID        string    `json:"exam_id"`
// 	QuestionText  string    `json:"question_text"`
// 	MediaURL      string    `json:"media_url"` // URL absolut ke CDN
// 	Options       string    `json:"options"`   // Disimpan sebagai JSON string untuk fleksibilitas
// 	CorrectOption string    `json:"-"`         // Tidak dikirim ke frontend, hanya untuk koreksi
// 	CreatedAt     time.Time `json:"created_at"`
// }

// ExamResult merepresentasikan nilai akhir yang disinkronkan ke SQLite
type ExamResult struct {
	ID             int64     `json:"id"`
	ParticipantID  string    `json:"participant_id"` // Bisa NISN atau UUID dari service lain
	ExamID         string    `json:"exam_id"`
	TotalQuestions int       `json:"total_questions"`
	CorrectAnswers int       `json:"correct_answers"`
	FinalScore     float64   `json:"final_score"`
	Status         string    `json:"status"` // SUBMITTED, GRADING, etc.
	SubmittedAt    time.Time `json:"submitted_at"`
}

// ParticipantAnswer merepresentasikan jawaban sementara di Redis
type ParticipantAnswer struct {
	ParticipantID string `json:"participant_id"`
	QuestionID    string `json:"question_id"`
	Answer        string `json:"answer"`
	Timestamp     int64  `json:"timestamp"`
}

// ParticipantStatus untuk melacak status koneksi via Redis
type ParticipantStatus struct {
	ParticipantID string `json:"participant_id"`
	ExamID        string `json:"exam_id"`
	Status        string `json:"status"` // CONNECTED, DISCONNECTED, SUBMITTED
	LastPing      int64  `json:"last_ping"`
}

// CbtRedisRepository mengurusi pencatatan jawaban kilat konkurensi tinggi
type CbtRedisRepository interface {
	SaveAnswerCache(ctx context.Context, studentID, examID, questionID, answer string) error
	GetAnswersCache(ctx context.Context, studentID, examID string) (map[string]string, error) // map[QuestionID]StudentAnswer
	DeleteAnswersCache(ctx context.Context, studentID, examID string) error
}
