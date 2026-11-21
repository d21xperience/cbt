package tenant

import (
	"context"
	"errors"

	// Archive
	archiveRepo "cbt-engine-service/internal/archive/repository"
	archiveUC "cbt-engine-service/internal/archive/usecase"

	// CBT
	cbtRedisRepo "cbt-engine-service/internal/cbt/repository/redis"
	cbtSqliteRepo "cbt-engine-service/internal/cbt/repository/sqlite"
	cbtUc "cbt-engine-service/internal/cbt/usecase"

	// Crypto
	"cbt-engine-service/internal/crypto"

	// Proctoring
	proctoringRepo "cbt-engine-service/internal/proctoring/repository"
	proctoringUC "cbt-engine-service/internal/proctoring/usecase"

	// Scheduling
	schedulingRepo "cbt-engine-service/internal/scheduling/repository"
	schedulingUC "cbt-engine-service/internal/scheduling/usecase"

	"github.com/redis/go-redis/v9"
)

var (
	ErrNoTenantInContext = errors.New("no tenant in context")
)

// Factory — membangun usecase per-tenant.
//
// Pattern:
//   - DB handle: cached via Manager (lazy open, LRU)
//   - Usecase instance: dibuat fresh per request (cheap)
//   - Redis client: shared (tenant-prefix Phase 4)
//   - Credential cipher: shared
//   - SIAKAD client: shared
type Factory struct {
	manager      *Manager
	redisClient  *redis.Client
	credCipher   *crypto.Cipher
	siakadClient *schedulingRepo.SiakadSyncClient
}

// NewFactory — buat factory
func NewFactory(
	manager *Manager,
	rdb *redis.Client,
	cipher *crypto.Cipher,
	siakad *schedulingRepo.SiakadSyncClient,
) *Factory {
	return &Factory{
		manager:      manager,
		redisClient:  rdb,
		credCipher:   cipher,
		siakadClient: siakad,
	}
}

// Usecases — bundle semua usecase untuk tenant dari context.
// Dijalankan fresh tiap request; hanya DB handle yang di-cache.
type Usecases struct {
	// Core usecases
	SchedulingUC      *schedulingUC.SchedulingUseCase
	AdminLoginUC      *schedulingUC.AdminLoginUseCase
	ParticipantAuthUC *schedulingUC.ParticipantAuthUseCase
	CredentialsUC     *schedulingUC.CredentialsUseCase
	ProctorUC         *schedulingUC.ProctorUseCase
	SiswaUC           *cbtUc.SiswaUseCase
	ParticipantUC     *cbtUc.ParticipantUseCase

	SchoolProfileUC *cbtUc.SchoolProfileUseCase

	ClassUC *cbtUc.ClassUseCase

	SubjectUC *cbtUc.SubjectUseCase

	ExamTypeUC *cbtUc.ExamTypeUseCase

	LessonUC *cbtUc.LessonUseCase

	AcademicPeriodUC *cbtUc.AcademicPeriodUseCase

	ClassDB *cbtSqliteRepo.ClassDB

	ExamScheduleUC *cbtUc.ExamScheduleUseCase

	TeacherUC *cbtUc.TeacherUseCase

	RoomUC *cbtUc.RoomUseCase
	// Exam usecases
	ExamUC    *cbtUc.ExamUseCase
	TokenUC   *cbtUc.TokenUseCase
	PaymentUC *cbtUc.PaymentUseCase

	// Repos yang dipakai langsung oleh handler (tanpa usecase wrapper)
	SessionRepo *cbtSqliteRepo.SessionDB
	// ... lainnya di Phase 3B

	// Archive
	ArchiveUC *archiveUC.ArchiveUseCase

	// Proctoring
	ProctoringUC *proctoringUC.ProctoringUseCase
}

// BuildUsecases — bangun bundle usecase untuk tenant dari context.
// Return error kalau tenant info tidak ada di context.
func (f *Factory) Usecases(ctx context.Context) (*Usecases, error) {
	info := FromContext(ctx)
	if info == nil {
		return nil, ErrNoTenantInContext
	}

	// Get tenant DB handle (cached)
	db, err := f.manager.Get(ctx, info.TenantID, info.DBPath)
	if err != nil {
		return nil, err
	}

	// === Build repos (fresh, cheap) ===
	// Scheduling repos
	localAuthDB := schedulingRepo.NewLocalAuthDB(db)
	adminDB := schedulingRepo.NewAdminDB(db)
	credRepo := schedulingRepo.NewCredentialsDB(db)
	proctorDB := schedulingRepo.NewProctorDB(db)

	// CBT repos
	sessionDB := cbtSqliteRepo.NewSessionDB(db)
	tokenDB := cbtSqliteRepo.NewTokenDB(db)
	paymentDB := cbtSqliteRepo.NewPaymentDB(db)
	siswaDB := cbtSqliteRepo.NewSiswaDB(db)
	siswaUC := cbtUc.NewSiswaUseCase(siswaDB, credRepo, f.credCipher)

	participantDB := cbtSqliteRepo.NewParticipantDB(db)
	participantUC := cbtUc.NewParticipantUseCase(participantDB, f.credCipher)

	schoolProfileDB := cbtSqliteRepo.NewSchoolProfileDB(db)

	schoolProfileUC := cbtUc.NewSchoolProfileUseCase(schoolProfileDB)

	classDB := cbtSqliteRepo.NewClassDB(db)

	classUC := cbtUc.NewClassUseCase(classDB)

	subjectDB := cbtSqliteRepo.NewSubjectDB(db)

	subjectUC := cbtUc.NewSubjectUseCase(subjectDB)

	examTypeDB := cbtSqliteRepo.NewExamTypeDB(db)

	examTypeUC := cbtUc.NewExamTypeUseCase(examTypeDB)

	lessonDB := cbtSqliteRepo.NewLessonDB(db)

	lessonUC := cbtUc.NewLessonUseCase(lessonDB)

	academicPeriodDB := cbtSqliteRepo.NewAcademicPeriodDB(db)

	academicPeriodUC := cbtUc.NewAcademicPeriodUseCase(academicPeriodDB, classDB, siswaDB, lessonDB, schoolProfileDB)

	examScheduleDB := cbtSqliteRepo.NewExamScheduleDB(db)

	examScheduleUC := cbtUc.NewExamScheduleUseCase(examScheduleDB)

	examDB := cbtSqliteRepo.NewExamDB(db)

	teacherDB := cbtSqliteRepo.NewTeacherDB(db)

	roomDB := cbtSqliteRepo.NewRoomDB(db)

	teacherUC := cbtUc.NewTeacherUseCase(teacherDB, f.credCipher)

	roomUC := cbtUc.NewRoomUseCase(roomDB)
	// Archive
	archiveDB := archiveRepo.NewArchiveDB(db)

	// Redis-based (shared client — tenant prefix Phase 4)
	examCache := cbtRedisRepo.NewExamCache(f.redisClient)
	proctoringRedis := proctoringRepo.NewProctoringRedis(f.redisClient)

	// === Build usecases ===
	uc := &Usecases{
		SchedulingUC:      schedulingUC.NewSchedulingUseCase(localAuthDB, f.siakadClient),
		AdminLoginUC:      schedulingUC.NewAdminLoginUseCase(adminDB),
		ParticipantAuthUC: schedulingUC.NewParticipantAuthUseCase(credRepo, f.credCipher),
		CredentialsUC:     schedulingUC.NewCredentialsUseCase(credRepo, f.credCipher),
		ProctorUC:         schedulingUC.NewProctorUseCase(proctorDB),

		ExamUC:        cbtUc.NewExamUseCase(examDB, examCache, examDB, examCache),
		TokenUC:       cbtUc.NewTokenUseCase(tokenDB, sessionDB),
		PaymentUC:     cbtUc.NewPaymentUseCase(paymentDB),
		SiswaUC:       siswaUC,
		ParticipantUC: participantUC,

		SchoolProfileUC: schoolProfileUC,

		ClassUC: classUC,

		SubjectUC: subjectUC,

		ExamTypeUC: examTypeUC,

		LessonUC: lessonUC,

		AcademicPeriodUC: academicPeriodUC,

		ClassDB: classDB,

		ExamScheduleUC: examScheduleUC,

		TeacherUC: teacherUC,

		RoomUC:      roomUC,
		SessionRepo: sessionDB,

		ArchiveUC:    archiveUC.NewArchiveUseCase(archiveDB, f.siakadClient, f.redisClient),
		ProctoringUC: proctoringUC.NewProctoringUseCase(proctoringRedis),
	}

	return uc, nil
}

// ManagerStats — expose stats untuk health endpoint
func (f *Factory) ManagerStats() map[string]any {
	return f.manager.Stats()
}
