package usecase

import (
	"context"
	"log"
	"time"

	"cbt-engine-service/internal/cbt/repository/sqlite"
)

// StartTokenRotator — goroutine yang cek tiap 1 menit,
// rotate token untuk sesi aktif yang tokennya hampir expired
func StartTokenRotator(ctx context.Context, sessionDB *sqlite.SessionDB, tokenUC *TokenUseCase) {
	log.Println("🔄 Token Rotator started (check interval: 1 menit)")

	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("🛑 Token Rotator shutting down")
			return
		case <-ticker.C:
			rotateActiveSessions(ctx, sessionDB, tokenUC)
		}
	}
}

func rotateActiveSessions(ctx context.Context, sessionDB *sqlite.SessionDB, tokenUC *TokenUseCase) {
	now := time.Now()

	// Query sesi yang sedang berjalan (start_time <= now <= end_time)
	const q = `SELECT id FROM exam_sessions 
	           WHERE status != 'CLOSED' 
	           AND start_time <= ? 
	           AND end_time > ?`

	rows, err := sessionDB.DB.QueryContext(ctx, q,
		now.UTC().Format(time.RFC3339),
		now.UTC().Format(time.RFC3339))
	if err != nil {
		log.Printf("[ROTATOR] Query error: %v", err)
		return
	}
	defer rows.Close()

	var sessionIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err == nil {
			sessionIDs = append(sessionIDs, id)
		}
	}

	for _, sid := range sessionIDs {
		current, err := tokenUC.GetCurrent(ctx, sid)
		if err != nil {
			log.Printf("[ROTATOR] GetCurrent %s: %v", sid, err)
			continue
		}

		// Rotate jika: belum ada token, atau token hampir expired (< 3 menit)
		needsRotation := current == nil ||
			time.Until(current.ValidUntil) < 3*time.Minute

		if needsRotation {
			if _, err := tokenUC.Rotate(ctx, sid, "auto-rotator"); err != nil {
				log.Printf("[ROTATOR] Rotate %s: %v", sid, err)
			} else {
				log.Printf("[ROTATOR] Rotated token untuk session %s", sid)
			}
		}
	}
}
