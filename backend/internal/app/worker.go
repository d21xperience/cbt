// internal/app/workers.go
package app

import (
	"github.com/rs/zerolog/log"
)

// StartWorkers — start background workers.
//
// Phase 3A: DISABLED. Worker butuh iterasi lintas-tenant yang belum ada.
// Phase 3B akan refactor worker untuk iterate semua active tenant.
//
// Worker yang dimatikan:
//   - Token Rotator (auto-rotate exam token tiap 30 menit)
//   - Attendance Worker (auto-detect peserta absent)
//
// Workaround sementara:
//   - Token rotate manual via POST /admin/sessions/:id/token/rotate
//   - Attendance manual via admin endpoint
func StartWorkers(infra *Infrastructure) {
	// TODO Phase 3B: implement tenant-aware workers
	// Iterate all active tenants dari platform DB, jalankan worker per tenant.

	log.Warn().Msg("⚠️  Token Rotator & Attendance Worker DISABLED — Phase 3B akan aktifkan kembali (tenant-aware)")
}
