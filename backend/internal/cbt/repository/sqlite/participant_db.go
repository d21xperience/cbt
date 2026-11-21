package sqlite

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
)

// ParticipantDB menangani query khusus untuk Manajemen Ujian (Data Peserta)
type ParticipantDB struct {
	DB *sql.DB
}

func NewParticipantDB(db *sql.DB) *ParticipantDB {
	return &ParticipantDB{DB: db}
}

// ParticipantView adalah DTO untuk response UI Data Peserta
type ParticipantView struct {
	ID           string `json:"id"`
	NIS          string `json:"nis"`
	NISN         string `json:"nisn"`
	Nama         string `json:"nama"`
	JenisKelamin string `json:"jenis_kelamin"`
	KelasID      string `json:"kelas_id"`
	KelasNama    string `json:"kelas_nama"`
	Username     string `json:"username"`
	IsActive     bool   `json:"is_active"`
}

// GetParticipants mengambil data siswa yang terdaftar di kelas pada periode tertentu
func (r *ParticipantDB) GetParticipants(ctx context.Context, periodID string) ([]ParticipantView, error) {
	query := `
		SELECT 
			s.id, s.nis, COALESCE(s.nisn, ''), s.nama, s.jenis_kelamin,
			COALESCE(cm.class_id, ''), COALESCE(c.nama, ''),
			COALESCE(pc.username, s.nisn), COALESCE(pc.is_active, 0)
		FROM siswa s
		INNER JOIN class_members cm ON cm.siswa_id = s.id AND cm.is_active = 1
		LEFT JOIN classes c ON c.id = cm.class_id
		LEFT JOIN participant_credentials pc ON pc.nisn = s.nisn
		WHERE cm.academic_period_id = ?
		ORDER BY c.nama ASC, s.nama ASC
	`
	rows, err := r.DB.QueryContext(ctx, query, periodID)
	if err != nil {
		return nil, fmt.Errorf("gagal query participants: %w", err)
	}
	defer rows.Close()

	var list []ParticipantView
	for rows.Next() {
		var p ParticipantView
		var isActive int
		if err := rows.Scan(&p.ID, &p.NIS, &p.NISN, &p.Nama, &p.JenisKelamin,
			&p.KelasID, &p.KelasNama, &p.Username, &isActive); err != nil {
			return nil, err
		}
		p.IsActive = isActive == 1
		list = append(list, p)
	}
	return list, rows.Err()
}

// GetExamMode membaca status mode ujian dari tenant_settings
func (r *ParticipantDB) GetExamMode(ctx context.Context) (string, error) {
	var mode string
	err := r.DB.QueryRowContext(ctx, `SELECT value FROM tenant_settings WHERE key = 'exam_mode'`).Scan(&mode)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return mode, err
}

// ToggleExamModeAndReset menjalankan transaksi reset data jika mode ujian dinyalakan
func (r *ParticipantDB) ToggleExamModeAndReset(ctx context.Context, mode string, encryptedCreds []EncryptedCredential) error {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Update / Insert status mode
	_, err = tx.ExecContext(ctx, `
		INSERT INTO tenant_settings (key, value, updated_at) 
		VALUES ('exam_mode', ?, CURRENT_TIMESTAMP)
		ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
	`, mode)
	if err != nil {
		return fmt.Errorf("gagal update exam_mode: %w", err)
	}

	// Jika mode dimatikan (string kosong), stop di sini. Tidak perlu reset data.
	if mode == "" {
		return tx.Commit()
	}

	// 2. Hapus semua sesi ujian yang ada (Reset)
	_, err = tx.ExecContext(ctx, `DELETE FROM participant_sessions`)
	if err != nil {
		return fmt.Errorf("gagal reset participant_sessions: %w", err)
	}

	// 3. Hapus semua kredensial lama (Reset Password)
	_, err = tx.ExecContext(ctx, `DELETE FROM participant_credentials`)
	if err != nil {
		return fmt.Errorf("gagal reset participant_credentials: %w", err)
	}

	// 4. Insert kredensial baru yang sudah digenerate (passing dari Usecase)
	//    — sertakan tenant_id (UUID) & qr_token agar tidak bergantung lazy-gen.
	for _, cred := range encryptedCreds {
		tenantID := cred.TenantID
		if tenantID == "" {
			tenantID = "default" // fallback defensif
		}
		_, err = tx.ExecContext(ctx, `
				INSERT INTO participant_credentials
					(nisn, username, password_enc, password_iv, is_active, tenant_id, qr_token)
				VALUES (?, ?, ?, ?, 1, ?, ?)
			`, cred.NISN, cred.Username, cred.EncryptedPass, cred.IV, tenantID, cred.QrToken)
		if err != nil {
			return fmt.Errorf("gagal insert credential baru untuk %s: %w", cred.NISN, err)
		}
	}

	return tx.Commit()
}

// Struct helper untuk passing data dari Usecase ke Repo
type EncryptedCredential struct {
	NISN          string
	Username      string
	EncryptedPass []byte
	IV            []byte
	TenantID      string // UUID tenant (bukan 'default')
	QrToken       string // QR token baru (regenerate massal)
}

// UpdateParticipantPassword digunakan untuk Reset Password manual (tombol ikon refresh di UI)
func (r *ParticipantDB) UpdateParticipantPassword(ctx context.Context, nisn string, encPass []byte, iv []byte) error {
	_, err := r.DB.ExecContext(ctx, `
		UPDATE participant_credentials 
		SET password_enc = ?, password_iv = ?, generated_at = CURRENT_TIMESTAMP 
		WHERE nisn = ?
	`, encPass, iv, nisn)
	return err
}

// Stub helper for UUID generation if needed
var _ = uuid.NewString

// examCardRow adalah struct internal untuk scanning hasil JOIN
type examCardRow struct {
	StudentID         string
	StudentNIS        string
	NISN              string
	StudentName       string
	ClassID           string
	ClassNama         string
	Username          string
	PasswordEnc       []byte
	PasswordIV        []byte
	QrToken           string
	DeviceFingerprint string
	IsRevoked         int
	IsBlocked         int
	Reason            string
}

// GetExamCards mengambil data siswa + kredensial + status payment gate untuk cetak kartu
func (r *ParticipantDB) GetExamCards(ctx context.Context, classID, search string) ([]examCardRow, error) {
	query := `
		SELECT 
			s.id, s.nis, COALESCE(s.nisn, '') as nisn, s.nama, 
			COALESCE(cm.class_id, s.kelas_id) as class_id, COALESCE(c.nama, s.kelas_nama) as class_nama,
			COALESCE(pc.username, COALESCE(s.nisn, s.nis)) as username,
			pc.password_enc, pc.password_iv,
                    COALESCE(pc.qr_token, '') as qr_token,
                    COALESCE(pc.device_fingerprint, '') as device_fingerprint,
                    COALESCE(pc.is_revoked, 0) as is_revoked,
                    COALESCE(pg.is_blocked, 0) as is_blocked, COALESCE(pg.reason, '') as reason
		FROM siswa s
		LEFT JOIN class_members cm ON cm.siswa_id = s.id AND cm.is_active = 1
		LEFT JOIN classes c ON c.id = cm.class_id
		LEFT JOIN participant_credentials pc ON pc.nisn = COALESCE(s.nisn, '') AND pc.is_active = 1
		LEFT JOIN payment_gates pg ON pg.nisn = COALESCE(s.nisn, '')
		WHERE s.status = 'AKTIF'
	`
	args := []any{}
	if classID != "" {
		query += ` AND (cm.class_id = ? OR s.kelas_id = ?)`
		args = append(args, classID, classID)
	}
	if search != "" {
		query += ` AND (s.nama LIKE ? OR s.nis LIKE ? OR s.nisn LIKE ?)`
		like := "%" + search + "%"
		args = append(args, like, like, like)
	}
	query += ` ORDER BY class_nama ASC, s.nama ASC`

	rows, err := r.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("gagal query exam cards: %w", err)
	}
	defer rows.Close()

	var list []examCardRow
	for rows.Next() {
		var row examCardRow
		if err := rows.Scan(
			&row.StudentID, &row.StudentNIS, &row.NISN, &row.StudentName,
			&row.ClassID, &row.ClassNama, &row.Username,
			&row.PasswordEnc, &row.PasswordIV,
			&row.QrToken, &row.DeviceFingerprint, &row.IsRevoked,
			&row.IsBlocked, &row.Reason,
		); err != nil {
			return nil, err
		}
		list = append(list, row)
	}
	return list, rows.Err()
}

// GetSetting mengambil nilai setting berdasarkan key
func (r *ParticipantDB) GetSetting(ctx context.Context, key string) (string, error) {
	var value string
	err := r.DB.QueryRowContext(ctx, `SELECT value FROM tenant_settings WHERE key = ?`, key).Scan(&value)
	return value, err
}

// SetSetting menyimpan atau memperbarui nilai setting
func (r *ParticipantDB) SetSetting(ctx context.Context, key, value string) error {
	_, err := r.DB.ExecContext(ctx, `
		INSERT INTO tenant_settings (key, value) VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
	`, key, value)
	return err
}
