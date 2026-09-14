package repository

import (
	"cbt-engine-service/internal/scheduling/domain"
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
)

type LocalAuthDB struct {
	DB *sql.DB
}

func NewLocalAuthDB(db *sql.DB) *LocalAuthDB {
	return &LocalAuthDB{DB: db}
}

// ValidateParticipantLocal mengecek hak ujian dari SQLite (Digunakan saat Login/Hari H)
func (r *LocalAuthDB) ValidateParticipantLocal(nisn, pembelajaranID string) (*domain.ValidateParticipantResponse, error) {
	query := `SELECT participant_id, name, rombel_name, subject_name 
			  FROM eligible_participants 
			  WHERE nisn = ? AND pembelajaran_id = ? LIMIT 1`

	row := r.DB.QueryRow(query, nisn, pembelajaranID)

	var resp domain.ValidateParticipantResponse
	err := row.Scan(&resp.ParticipantID, &resp.Name, &resp.RombelName, &resp.SubjectName)
	if err == sql.ErrNoRows {
		return nil, nil // Tidak ditemukan
	}
	if err != nil {
		return nil, err
	}

	resp.IsValid = true
	resp.Message = "Peserta terverifikasi secara lokal"
	return &resp, nil
}

// UpsertParticipant menyimpan/update data hasil sync dari SIAKAD
func (r *LocalAuthDB) UpsertParticipant(p domain.EligibleParticipant) error {
	query := `INSERT INTO eligible_participants (participant_id, nisn, name, rombel_name, subject_name, pembelajaran_id, semester_id, synced_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			  ON CONFLICT(participant_id) DO UPDATE SET 
			  nisn = excluded.nisn, name = excluded.name, rombel_name = excluded.rombel_name, 
			  subject_name = excluded.subject_name, synced_at = CURRENT_TIMESTAMP`

	_, err := r.DB.Exec(query, p.ParticipantID, p.NISN, p.Name, p.RombelName, p.SubjectName, p.PembelajaranID, p.SemesterID)
	return err
}

// InsertExternalBatch menyisikkan 1 batch peserta eksternal ke SQLite secara massal
func (r *LocalAuthDB) InsertExternalBatch(ctx context.Context, batch []domain.EligibleParticipant) error {
	if len(batch) == 0 {
		return nil
	}

	// 1. Mulai Transaksi (Wajib untuk performa massal insert di SQLite)
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("gagal begin tx: %w", err)
	}
	defer tx.Rollback() // Aman: jika commit gagal atau panic, tx akan di-rollback

	// 2. Prepare Statement (Hanya di-parse 1 kali oleh SQLite untuk 1 batch)
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO eligible_participants 
		(participant_id, nisn, name, rombel_name, subject_name, pembelajaran_id, semester_id, source, external_school, exam_id) 
		VALUES (?, ?, ?, ?, ?, ?, ?, 'EXTERNAL', ?, ?)
		ON CONFLICT(participant_id) DO UPDATE SET 
		name = excluded.name, rombel_name = excluded.rombel_name, external_school = excluded.external_school, exam_id = excluded.exam_id
	`)
	if err != nil {
		return fmt.Errorf("gagal prepare stmt: %w", err)
	}
	defer stmt.Close()

	// 3. Eksekusi untuk setiap baris dalam batch
	for i := range batch {
		p := &batch[i]
		if p.ParticipantID == "" {
			p.ParticipantID = uuid.NewString()
		}

		_, err := stmt.ExecContext(ctx,
			p.ParticipantID, p.NISN, p.Name, p.RombelName, p.SubjectName,
			p.PembelajaranID, p.SemesterID, p.ExternalSchool, p.ExamID,
		)
		if err != nil {
			return fmt.Errorf("gagal insert NISN %s: %w", p.NISN, err)
		}
	}

	// 4. Commit Transaksi
	return tx.Commit()
}

// 🔥 TAMBAHKAN FUNGSI INI:
// ValidateExternalLocal mengecek hak ujian untuk peserta EKSTERNAL dari SQLite
func (r *LocalAuthDB) ValidateExternalLocal(id, examID string) (*domain.ValidateParticipantResponse, error) {
	// Untuk eksternal, pencarian didasarkan pada NISN (atau ID Eksternal) dan exam_id
	query := `SELECT participant_id, name, rombel_name, subject_name, external_school 
			  FROM eligible_participants 
			  WHERE nisn = ? AND exam_id = ? AND source = 'EXTERNAL' LIMIT 1`

	row := r.DB.QueryRow(query, id, examID)

	var resp domain.ValidateParticipantResponse
	var externalSchool sql.NullString // Gunakan NullString karena kolom external_school bisa kosong (NULL)

	err := row.Scan(&resp.ParticipantID, &resp.Name, &resp.RombelName, &resp.SubjectName, &externalSchool)
	if err == sql.ErrNoRows {
		return nil, nil // Tidak ditemukan, kembalikan nil (bukan error)
	}
	if err != nil {
		return nil, err
	}

	// Isi external_school jika valid
	if externalSchool.Valid {
		resp.ExternalSchool = externalSchool.String
	}

	resp.IsValid = true
	resp.Message = "Peserta eksternal terverifikasi secara lokal"
	resp.Source = "EXTERNAL"

	return &resp, nil
}
