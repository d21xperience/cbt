// internal/app/server.go
package app

import (
	"os"
	"os/signal"
	"syscall"

	"cbt-engine-service/internal/config"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

// RunServer — start Fiber + wait for shutdown signal + graceful shutdown.
func RunServer(app *fiber.App, cfg config.Config) error {
	errCh := make(chan error, 1)

	// Start server
	go func() {
		log.Info().Msgf("🌐 Server Gofiber CBT Engine berjalan di port %s", cfg.AppPort)
		if err := app.Listen(cfg.AppPort); err != nil {
			errCh <- err
		}
	}()

	// Wait for signal or error
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		return err
	case sig := <-quit:
		log.Info().Str("signal", sig.String()).Msg("🛑 Menerima sinyal shutdown")
	}

	// Graceful shutdown
	if err := app.Shutdown(); err != nil {
		log.Error().Err(err).Msg("Error shutdown Fiber")
		return err
	}

	log.Info().Msg("✅ Server dihentikan dengan bersih")
	return nil
}
