package sqlite

import (
	"cbt-engine-service/internal/cbt/domain"
	"context"
	"database/sql"
)

type RoomDB struct{ DB *sql.DB }

func NewRoomDB(db *sql.DB) *RoomDB { return &RoomDB{DB: db} }

func (r *RoomDB) List(ctx context.Context) ([]domain.Room, error) {
	rows, err := r.DB.QueryContext(ctx, `SELECT id, nama, COALESCE(kapasitas,0), COALESCE(gedung,'') FROM rooms ORDER BY nama ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []domain.Room
	for rows.Next() {
		var rm domain.Room
		rows.Scan(&rm.ID, &rm.Nama, &rm.Kapasitas, &rm.Gedung)
		list = append(list, rm)
	}
	return list, nil
}

func (r *RoomDB) GetByID(ctx context.Context, id string) (*domain.Room, error) {
	var rm domain.Room
	err := r.DB.QueryRowContext(ctx, `SELECT id, nama, COALESCE(kapasitas,0), COALESCE(gedung,'') FROM rooms WHERE id = ?`, id).Scan(&rm.ID, &rm.Nama, &rm.Kapasitas, &rm.Gedung)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &rm, err
}

func (r *RoomDB) Create(ctx context.Context, rm *domain.Room) error {
	_, err := r.DB.ExecContext(ctx, `INSERT INTO rooms (id, nama, kapasitas, gedung) VALUES (?, ?, ?, ?)`, rm.ID, rm.Nama, rm.Kapasitas, rm.Gedung)
	return err
}

func (r *RoomDB) Update(ctx context.Context, rm *domain.Room) error {
	_, err := r.DB.ExecContext(ctx, `UPDATE rooms SET nama=?, kapasitas=?, gedung=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, rm.Nama, rm.Kapasitas, rm.Gedung, rm.ID)
	return err
}

func (r *RoomDB) Delete(ctx context.Context, id string) error {
	_, err := r.DB.ExecContext(ctx, `DELETE FROM rooms WHERE id = ?`, id)
	return err
}
