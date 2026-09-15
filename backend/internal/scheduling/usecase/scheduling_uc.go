package usecase

import (
	"cbt-engine-service/internal/scheduling/domain"
	"cbt-engine-service/internal/scheduling/repository"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"log"
	"strings"
)

const batchSize = 200 // Ukuran batch optimal untuk SQLite (Hemat RAM & Cepat)
type SchedulingUseCase struct {
	localDB    *repository.LocalAuthDB
	syncClient *repository.SiakadSyncClient
}
type LoginRequest struct {
	ID             string `json:"id"`              // Bisa NISN (SIAKAD) atau No.ID Eksternal
	ExamIdentifier string `json:"exam_identifier"` // Bisa PembelajaranID (SIAKAD) atau ExamCode (Eksternal)
}

func NewSchedulingUseCase(localDB *repository.LocalAuthDB, syncClient *repository.SiakadSyncClient) *SchedulingUseCase {
	return &SchedulingUseCase{
		localDB:    localDB,
		syncClient: syncClient,
	}
}

// ==========================================
// 1. LOGIKA HARI H (LOGIN / MULAI UJIAN)
// ==========================================
func (uc *SchedulingUseCase) ValidateForExam(ctx context.Context, nisn, pembelajaranID string) (*domain.ValidateParticipantResponse, error) {
	// 100% Query ke SQLite Lokal. Tidak ada network call.
	resp, err := uc.localDB.ValidateParticipantLocal(nisn, pembelajaranID)
	if err != nil {
		return nil, errors.New("terjadi kesalahan pada server ujian")
	}
	if resp == nil || !resp.IsValid {
		return nil, errors.New("NISN tidak terdaftar atau tidak berhak mengikuti mata pelajaran ini")
	}

	// Jika valid, generate Token Ujian (Akan kita bahas di modul CBT Core)
	// token := generateExamToken(resp.ParticipantID)

	return resp, nil
}

// ==========================================
// 2. LOGIKA PRA-UJIAN (SINKRONISASI DATA)
// ==========================================
func (uc *SchedulingUseCase) SyncParticipantsFromSiakad(ctx context.Context, pembelajaranID, semesterID string) (int, error) {
	log.Printf("[SYNC] Memulai sinkronisasi data dari SIAKAD untuk pembelajaran %s...", pembelajaranID)

	// 1. Tarik data dari SIAKAD via Cloudflare Tunnel
	participants, err := uc.syncClient.FetchEligibleParticipants(pembelajaranID, semesterID)
	if err != nil {
		return 0, err
	}

	// 2. Simpan ke SQLite Lokal (Upsert)
	successCount := 0
	for _, p := range participants {
		if err := uc.localDB.UpsertParticipant(p); err != nil {
			log.Printf("[SYNC] Error menyimpan peserta %s: %v", p.NISN, err)
			continue
		}
		successCount++
	}

	log.Printf("[SYNC] Selesai. %d dari %d peserta berhasil disinkronisasi ke database lokal.", successCount, len(participants))
	return successCount, nil
}

func (uc *SchedulingUseCase) ImportExternalFromCSV(ctx context.Context, examID, semesterID, schoolName string, file io.Reader) (int, error) {
	reader := csv.NewReader(file)
	reader.LazyQuotes = true // Toleransi untuk CSV yang formatnya agak berantakan
	reader.TrimLeadingSpace = true

	// 1. Baca & Validasi Header
	header, err := reader.Read()
	if err != nil {
		return 0, fmt.Errorf("gagal membaca header CSV: %w", err)
	}

	// Buat mapping kolom agar tidak kaku dengan urutan CSV
	colMap := map[string]int{}
	for i, col := range header {
		colMap[strings.ToLower(strings.TrimSpace(col))] = i
	}

	if _, ok := colMap["nisn"]; !ok {
		return 0, fmt.Errorf("kolom 'nisn' wajib ada di header CSV")
	}
	if _, ok := colMap["nama"]; !ok {
		return 0, fmt.Errorf("kolom 'nama' wajib ada di header CSV")
	}

	// 2. Streaming Baris & Batching
	// Alokasi kapasitas awal agar tidak perlu resize array terus-menerus
	batch := make([]domain.EligibleParticipant, 0, batchSize)
	totalInserted := 0
	lineNum := 1

	for {
		lineNum++
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Printf("[CSV] Error parsing baris %d: %v. Melewati baris.", lineNum, err)
			continue
		}

		// Mapping data dari CSV ke Struct
		p := domain.EligibleParticipant{
			NISN:           getCol(record, colMap, "nisn"),
			Name:           getCol(record, colMap, "nama"),
			RombelName:     getCol(record, colMap, "rombel"), // Opsional
			ExternalSchool: schoolName,
			SemesterID:     semesterID,
			ExamID:         examID,
		}

		// Validasi dasar
		if p.NISN == "" || p.Name == "" {
			log.Printf("[CSV] Baris %d dilewati: NISN atau Nama kosong.", lineNum)
			continue
		}

		batch = append(batch, p)

		// 3. Jika batch penuh, insert ke DB dan RESET SLICE (Memory Reuse)
		if len(batch) >= batchSize {
			if err := uc.localDB.InsertExternalBatch(ctx, batch); err != nil {
				return totalInserted, fmt.Errorf("gagal insert batch di baris %d: %w", lineNum, err)
			}
			totalInserted += len(batch)

			// 🔥 TRIK HEMAT RAM: Reset length ke 0, tapi pertahankan capacity.
			// Baris berikutnya akan menimpa data lama di memory yang sama. Zero GC pressure!
			batch = batch[:0]
		}
	}

	// 4. Insert sisa data di batch terakhir (jika < 200)
	if len(batch) > 0 {
		if err := uc.localDB.InsertExternalBatch(ctx, batch); err != nil {
			return totalInserted, fmt.Errorf("gagal insert batch terakhir: %w", err)
		}
		totalInserted += len(batch)
	}

	log.Printf("[IMPORT] Selesai. %d peserta eksternal dari %s berhasil diimpor.", totalInserted, schoolName)
	return totalInserted, nil
}

// Helper function untuk mengambil nilai kolom berdasarkan nama header
func getCol(record []string, colMap map[string]int, colName string) string {
	idx, ok := colMap[colName]
	if !ok || idx >= len(record) {
		return ""
	}
	return strings.TrimSpace(record[idx])
}

func (uc *SchedulingUseCase) UnifiedLogin(ctx context.Context, req LoginRequest) (*domain.ValidateParticipantResponse, error) {
	// 1. Coba cari sebagai peserta SIAKAD (berdasarkan NISN & PembelajaranID)
	resp, err := uc.localDB.ValidateParticipantLocal(req.ID, req.ExamIdentifier)
	if err == nil && resp != nil && resp.IsValid {
		resp.Source = "SIAKAD"
		return resp, nil
	}

	// 2. Jika tidak ditemukan, coba cari sebagai peserta EKSTERNAL (berdasarkan ID & ExamID)
	respExt, err := uc.localDB.ValidateExternalLocal(req.ID, req.ExamIdentifier)
	if err == nil && respExt != nil && respExt.IsValid {
		respExt.Source = "EXTERNAL"
		return respExt, nil
	}

	// 3. Jika keduanya tidak ada
	return nil, errors.New("ID atau Kode Ujian tidak dikenali. Pastikan Anda terdaftar.")
}
