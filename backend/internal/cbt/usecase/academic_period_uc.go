package usecase

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"cbt-engine-service/internal/cbt/domain"
	"cbt-engine-service/internal/cbt/repository/sqlite"

	"github.com/google/uuid"
)

type AcademicPeriodUseCase struct {
	periodRepo   *sqlite.AcademicPeriodDB
	classRepo    *sqlite.ClassDB
	siswaDB      *sqlite.SiswaDB
	lessonDB     *sqlite.LessonDB
	schoolProfDB *sqlite.SchoolProfileDB
}

func NewAcademicPeriodUseCase(
	periodRepo *sqlite.AcademicPeriodDB,
	classRepo *sqlite.ClassDB,
	siswaDB *sqlite.SiswaDB,
	lessonDB *sqlite.LessonDB,
	schoolProfDB *sqlite.SchoolProfileDB,
) *AcademicPeriodUseCase {
	return &AcademicPeriodUseCase{
		periodRepo:   periodRepo,
		classRepo:    classRepo,
		siswaDB:      siswaDB,
		lessonDB:     lessonDB,
		schoolProfDB: schoolProfDB,
	}
}

func (uc *AcademicPeriodUseCase) List(ctx context.Context) ([]domain.AcademicPeriod, error) {
	return uc.periodRepo.ListAll(ctx)
}

func (uc *AcademicPeriodUseCase) Activate(ctx context.Context, id string) error {
	// Verifikasi periode ada
	list, err := uc.periodRepo.ListAll(ctx)
	if err != nil {
		return err
	}
	found := false
	for _, p := range list {
		if p.ID == id {
			found = true
			break
		}
	}
	if !found {
		return domain.ErrAcademicPeriodNotFound
	}

	return uc.periodRepo.SetActive(ctx, id)
}

// CreateWithRollover — Buat periode baru + copy data dari periode aktif
func (uc *AcademicPeriodUseCase) CreateWithRollover(ctx context.Context, ay, semester string) (*domain.RolloverResult, error) {
	// 1. Validasi format
	ay = strings.TrimSpace(ay)
	semester = strings.ToUpper(strings.TrimSpace(semester))
	if !isValidAcademicYear(ay) {
		return nil, fmt.Errorf("format tahun ajaran harus YYYY/YYYY")
	}
	if semester != "GANJIL" && semester != "GENAP" {
		return nil, fmt.Errorf("semester harus GANJIL atau GENAP")
	}

	// 2. Cek periode belum ada
	existing, _ := uc.periodRepo.GetByPeriod(ctx, ay, semester)
	if existing != nil {
		return nil, domain.ErrAcademicPeriodExist
	}

	// 3. Dapatkan periode aktif saat ini
	current, err := uc.periodRepo.GetActive(ctx)
	if err != nil || current == nil {
		return nil, fmt.Errorf("tidak ada periode aktif")
	}

	// 4. Tentukan jenjang & durasi
	jenjang := "SMA"
	durasi := 3
	if sp, _ := uc.schoolProfDB.Get(ctx); sp != nil {
		_ = sp
	}
	// Ambil dari tenant jika tersedia (fallback)
	// Note: jenjang & durasi sebenarnya bisa dibaca dari tenants / school_profile
	// Untuk sementara hardcoded SMA/3 — bisa diimprove nanti
	_ = jenjang
	_ = durasi

	_, endTingkat := hitungTingkatRange(jenjang, durasi)

	// 5. Copy classes (naik tingkat, skip tingkat akhir)
	oldClasses, _ := uc.classRepo.ListByPeriodID(ctx, current.ID)
	classMap := make(map[string]string) // oldID -> newID
	classesCopied := 0

	for _, oldClass := range oldClasses {
		if oldClass.Tingkat >= endTingkat {
			continue // Skip tingkat akhir (lulus)
		}
		newTingkat := oldClass.Tingkat + 1
		newNama := renameKelas(oldClass.Nama, newTingkat)
		newClass := domain.Class{
			ID:                uuid.NewString(),
			Nama:              newNama,
			Tingkat:           newTingkat,
			Kurikulum:         oldClass.Kurikulum,
			JenisRombel:       oldClass.JenisRombel,
			ProgramKeahlianID: oldClass.ProgramKeahlianID,
			RuangID:           oldClass.RuangID,
			RuangNama:         oldClass.RuangNama,
			AcademicPeriodID:  generatePeriodID(ay, semester),
		}
		if err := uc.classRepo.Create(ctx, &newClass); err != nil {
			return nil, fmt.Errorf("gagal copy class %s: %w", oldClass.Nama, err)
		}
		classMap[oldClass.ID] = newClass.ID
		classesCopied++
	}

	// 6. Copy class_members (siswa)
	studentsCopied, graduatesCount, err := uc.rolloverClassMembers(ctx, current.AcademicYear, current.Semester, ay, semester, classMap)
	if err != nil {
		return nil, fmt.Errorf("gagal copy students: %w", err)
	}

	// 7. Copy lessons (remap class_id)
	lessonsCopied, err := uc.rolloverLessons(ctx, current.AcademicYear, current.Semester, ay, semester, classMap)
	if err != nil {
		return nil, fmt.Errorf("gagal copy lessons: %w", err)
	}

	// 8. Insert periode baru (aktif), deactivate lama
	newPeriod := &domain.AcademicPeriod{
		ID:           generatePeriodID(ay, semester),
		AcademicYear: ay,
		Semester:     semester,
		IsActive:     true,
	}
	if err := uc.periodRepo.Create(ctx, newPeriod); err != nil {
		return nil, err
	}
	if err := uc.periodRepo.SetActive(ctx, newPeriod.ID); err != nil {
		return nil, err
	}

	// 9. Log audit
	_ = uc.periodRepo.LogRollover(ctx, map[string]any{
		"id":              uuid.NewString(),
		"from_period":     current.AcademicYear + "/" + current.Semester,
		"to_period":       ay + "/" + semester,
		"classes_copied":  classesCopied,
		"students_copied": studentsCopied,
		"lessons_copied":  lessonsCopied,
		"graduates_count": graduatesCount,
	})

	return &domain.RolloverResult{
		FromPeriod:     current.AcademicYear + "/" + current.Semester,
		ToPeriod:       ay + "/" + semester,
		ClassesCopied:  classesCopied,
		StudentsCopied: studentsCopied,
		LessonsCopied:  lessonsCopied,
		GraduatesCount: graduatesCount,
	}, nil
}

func (uc *AcademicPeriodUseCase) rolloverClassMembers(
	ctx context.Context,
	oldAY, oldSmt, newAY, newSmt string,
	classMap map[string]string,
	// endTingkat int,
) (int, int, error) {
	// Query class_members lama
	q := `SELECT cm.siswa_id, cm.class_id, c.tingkat 
	      FROM class_members cm
	      JOIN classes c ON c.id = cm.class_id
	      WHERE cm.academic_period_id = ? AND cm.is_active = 1`
	rows, err := uc.periodRepo.DB.QueryContext(ctx, q, generatePeriodID(oldAY, oldSmt))
	if err != nil {
		return 0, 0, err
	}
	defer rows.Close()

	type cmRow struct {
		siswaID string
		classID string
		tingkat int
	}
	var list []cmRow
	for rows.Next() {
		var r cmRow
		// rows.Scan(&r.siswaID, &r.classID, &r.tingkat)
		if err := rows.Scan(&r.siswaID, &r.classID, &r.tingkat); err != nil {
			return 0, 0, err
		}
		list = append(list, r)
	}
	if err := rows.Err(); err != nil {
		return 0, 0, err
	}
	copied := 0
	graduates := 0
	for _, r := range list {
		newClassID, ok := classMap[r.classID]
		if !ok {
			// Tingkat akhir — lulus
			_, _ = uc.periodRepo.DB.ExecContext(ctx,
				`UPDATE class_members SET is_active = 0, moved_at = CURRENT_TIMESTAMP 
				 WHERE siswa_id = ? AND academic_period_id = ?`,
				r.siswaID, generatePeriodID(oldAY, oldSmt))
			graduates++
			continue
		}
		newPeriodID := generatePeriodID(newAY, newSmt)
		cmID := fmt.Sprintf("cm-%s-%s", r.siswaID, newPeriodID)
		_, err := uc.periodRepo.DB.ExecContext(ctx,
			`INSERT OR IGNORE INTO class_members (id, siswa_id, class_id, academic_period_id, is_active) 
			 VALUES (?, ?, ?, ?, 1)`,
			cmID, r.siswaID, newClassID, newPeriodID)
		if err != nil {
			return copied, graduates, err
		}
		copied++
	}
	return copied, graduates, nil
}

func (uc *AcademicPeriodUseCase) rolloverLessons(
	ctx context.Context,
	oldAY, oldSmt, newAY, newSmt string,
	classMap map[string]string,
) (int, error) {
	q := `SELECT id, subject_id, class_id, teacher_id 
	      FROM lessons WHERE academic_period_id = ?`
	rows, err := uc.periodRepo.DB.QueryContext(ctx, q, generatePeriodID(oldAY, oldSmt))
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	type lRow struct {
		id, subjectID, classID, teacherID string
	}
	var list []lRow
	for rows.Next() {
		var r lRow
		// rows.Scan(&r.id, &r.subjectID, &r.classID, &r.teacherID)
		if err := rows.Scan(&r.id, &r.subjectID, &r.classID, &r.teacherID); err != nil {
			return 0, err
		}
		list = append(list, r)
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}
	count := 0
	for _, r := range list {
		newClassID, ok := classMap[r.classID]
		if !ok {
			continue // Kelas tidak di-copy (tingkat akhir), skip lesson
		}
		_, err := uc.periodRepo.DB.ExecContext(ctx,
			`INSERT INTO lessons (id, subject_id, class_id, teacher_id, academic_period_id) 
			 VALUES (?, ?, ?, ?, ?)`,
			uuid.NewString(), r.subjectID, newClassID, r.teacherID, generatePeriodID(newAY, newSmt))
		if err != nil {
			return count, err
		}
		count++
	}
	return count, nil
}

// Helper: validasi format YYYY/YYYY
func isValidAcademicYear(ay string) bool {
	re := regexp.MustCompile(`^\d{4}/\d{4}$`)
	return re.MatchString(ay)
}

// Helper: tentukan range tingkat berdasarkan jenjang & durasi
func hitungTingkatRange(jenjang string, durasi int) (int, int) {
	switch strings.ToUpper(jenjang) {
	case "SMA", "MA", "SMK", "MAK":
		return 10, 10 + durasi - 1
	case "SMP", "MTS":
		return 7, 7 + durasi - 1
	case "SD", "MI":
		return 1, 1 + durasi - 1
	default:
		return 10, 10 + durasi - 1
	}
}

// Helper: rename kelas (X RPL 1 → XI RPL 1)
func renameKelas(nama string, newTingkat int) string {
	newRoman := romanTingkat(newTingkat)
	parts := strings.SplitN(strings.TrimSpace(nama), " ", 2)
	if len(parts) < 2 {
		return newRoman + " " + nama
	}
	if isRomanNumeral(strings.ToUpper(parts[0])) {
		return newRoman + " " + parts[1]
	}
	return newRoman + " " + nama
}

func romanTingkat(t int) string {
	switch t {
	case 1:
		return "I"
	case 2:
		return "II"
	case 3:
		return "III"
	case 4:
		return "IV"
	case 5:
		return "V"
	case 6:
		return "VI"
	case 7:
		return "VII"
	case 8:
		return "VIII"
	case 9:
		return "IX"
	case 10:
		return "X"
	case 11:
		return "XI"
	case 12:
		return "XII"
	default:
		return fmt.Sprintf("%d", t)
	}
}

func isRomanNumeral(s string) bool {
	valid := []string{"I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"}
	for _, v := range valid {
		if s == v {
			return true
		}
	}
	return false
}

var _ = time.Now

// generatePeriodID — Format: [YYYY][1|2]
// 1 = GANJIL, 2 = GENAP
// Contoh: 2025/2026 GANJIL → "20251", 2025/2026 GENAP → "20252"
func generatePeriodID(ay, smt string) string {
	parts := strings.Split(ay, "/")
	if len(parts) < 2 {
		return uuid.NewString()
	}
	semSuffix := "1"
	if strings.ToUpper(smt) == "GENAP" {
		semSuffix = "2"
	}
	return parts[0] + semSuffix
}
