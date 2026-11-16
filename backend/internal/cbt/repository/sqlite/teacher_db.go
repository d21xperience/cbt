package sqlite

import (
	"cbt-engine-service/internal/cbt/domain"
	"context"
	"database/sql"
	"encoding/json"
)

type TeacherDB struct{ DB *sql.DB }

func NewTeacherDB(db *sql.DB) *TeacherDB { return &TeacherDB{DB: db} }

const teacherSelectCols = `id, nama, COALESCE(nip,''), COALESCE(email,''), username,
	password_enc, password_iv,
	COALESCE(jenis_kelamin,'L'), status, COALESCE(teaching_subject_ids,'[]'),
	COALESCE(is_homeroom,0), COALESCE(homeroom_class_id,''), COALESCE(homeroom_class_nama,''), COALESCE(has_logged_in,0)`

func (r *TeacherDB) scanRow(row *sql.Row) (*domain.Teacher, error) {
	var t domain.Teacher
	var subjectsJSON, homeroomID, homeroomName string
	var isHomeroom, hasLoggedIn int

	err := row.Scan(&t.ID, &t.Nama, &t.NIP, &t.Email, &t.Username, &t.PasswordEnc, &t.PasswordIV,
		&t.JenisKelamin, &t.Status, &subjectsJSON, &isHomeroom, &homeroomID, &homeroomName, &hasLoggedIn)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	t.IsHomeroom = isHomeroom == 1
	t.HasLoggedIn = hasLoggedIn == 1
	t.HomeroomClassID = homeroomID
	t.HomeroomClassName = homeroomName
	json.Unmarshal([]byte(subjectsJSON), &t.TeachingSubjectIDs)
	// NOTE: t.Password di-set oleh usecase via cipher.Decrypt (bukan di repo).
	return &t, nil
}

func (r *TeacherDB) List(ctx context.Context) ([]domain.Teacher, error) {
	q := `SELECT ` + teacherSelectCols + ` FROM teachers ORDER BY nama ASC`
	rows, err := r.DB.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.Teacher
	for rows.Next() {
		var t domain.Teacher
		var subjectsJSON, homeroomID, homeroomName string
		var isHomeroom, hasLoggedIn int
		if err := rows.Scan(&t.ID, &t.Nama, &t.NIP, &t.Email, &t.Username, &t.PasswordEnc, &t.PasswordIV,
			&t.JenisKelamin, &t.Status, &subjectsJSON, &isHomeroom, &homeroomID, &homeroomName, &hasLoggedIn); err != nil {
			return nil, err
		}
		t.IsHomeroom = isHomeroom == 1
		t.HasLoggedIn = hasLoggedIn == 1
		t.HomeroomClassID = homeroomID
		t.HomeroomClassName = homeroomName
		json.Unmarshal([]byte(subjectsJSON), &t.TeachingSubjectIDs)
		list = append(list, t)
	}
	return list, rows.Err()
}

func (r *TeacherDB) GetByID(ctx context.Context, id string) (*domain.Teacher, error) {
	q := `SELECT ` + teacherSelectCols + ` FROM teachers WHERE id = ?`
	return r.scanRow(r.DB.QueryRowContext(ctx, q, id))
}

func (r *TeacherDB) ExistsUsername(ctx context.Context, username string) (bool, error) {
	var count int
	err := r.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM teachers WHERE username = ?`, username).Scan(&count)
	return count > 0, err
}

func (r *TeacherDB) Create(ctx context.Context, t *domain.Teacher) error {
	subjectsJSON, _ := json.Marshal(t.TeachingSubjectIDs)
	q := `INSERT INTO teachers
		(id, nama, nip, email, username, password_hash, password_enc, password_iv,
		 jenis_kelamin, status, teaching_subject_ids, is_homeroom,
		 homeroom_class_id, homeroom_class_nama, has_logged_in)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := r.DB.ExecContext(ctx, q,
		t.ID, t.Nama, t.NIP, t.Email, t.Username, t.PasswordHash, t.PasswordEnc, t.PasswordIV,
		t.JenisKelamin, t.Status, string(subjectsJSON), boolToInt(t.IsHomeroom),
		t.HomeroomClassID, t.HomeroomClassName, boolToInt(t.HasLoggedIn))
	return err
}

func (r *TeacherDB) Update(ctx context.Context, t *domain.Teacher) error {
	subjectsJSON, _ := json.Marshal(t.TeachingSubjectIDs)
	q := `UPDATE teachers SET nama=?, nip=?, email=?, jenis_kelamin=?, status=?,
		teaching_subject_ids=?, is_homeroom=?, homeroom_class_id=?, homeroom_class_nama=?,
		updated_at=CURRENT_TIMESTAMP WHERE id=?`
	_, err := r.DB.ExecContext(ctx, q, t.Nama, t.NIP, t.Email, t.JenisKelamin, t.Status,
		string(subjectsJSON), boolToInt(t.IsHomeroom), t.HomeroomClassID, t.HomeroomClassName, t.ID)
	return err
}

// UpdatePassword — dipanggil setelah encrypt; tidak menyentuh password_plain.
func (r *TeacherDB) UpdatePassword(ctx context.Context, id, hash string, enc, iv []byte) error {
	_, err := r.DB.ExecContext(ctx,
		`UPDATE teachers SET password_hash=?, password_enc=?, password_iv=? WHERE id=?`,
		hash, enc, iv, id)
	return err
}

func (r *TeacherDB) Delete(ctx context.Context, id string) error {
	_, err := r.DB.ExecContext(ctx, `DELETE FROM teachers WHERE id = ?`, id)
	return err
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
