// internal/app/app.go
package app

import (
	"cbt-engine-service/internal/config"
)

// Run — entry point aplikasi. Dipanggil dari cmd/server/main.go.
//
// Flow:
//  1. Load config
//  2. Init infrastructure (DB, Redis, Factory, Tenant Manager)
//  3. Setup Fiber + global middleware
//  4. Register routes (with TenantResolver)
//  5. Start server + graceful shutdown
func Run() error {
	// 1. Load config
	cfg, err := config.LoadConfig(".")
	if err != nil {
		return err
	}

	// 2. Init infrastructure
	infra, err := InitInfra(cfg)
	if err != nil {
		return err
	}
	defer infra.Close()

	// 3. Setup Fiber (config + global middleware + CORS)
	fiberApp := SetupFiber(cfg)

	// 4. Register routes (includes TenantResolver)
	_ = RegisterRoutes(fiberApp, cfg, infra)

	// 5. Start background workers (Phase 3A: disabled)
	StartWorkers(infra)

	// 6. Run server + wait for shutdown signal
	return RunServer(fiberApp, cfg)
}
