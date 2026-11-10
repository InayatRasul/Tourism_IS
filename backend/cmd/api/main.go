// Command api starts the Tourism IS REST API.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"tourism-is/backend/internal/config"
	"tourism-is/backend/internal/platform/db"
	"tourism-is/backend/internal/seed"
	"tourism-is/backend/internal/server"
)

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, nil)))
	if err := run(); err != nil {
		slog.Error("fatal", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := db.Connect(ctx, cfg.DatabaseURL, cfg.DBTimeout)
	if err != nil {
		return err
	}
	defer pool.Close()
	if err := db.WaitReady(ctx, pool, 30, cfg.DBTimeout); err != nil {
		return err
	}
	if err := db.Migrate(cfg.DatabaseURL); err != nil {
		return err
	}
	slog.Info("migrations applied")
	if cfg.IsDev() {
		if err := seed.Run(ctx, pool); err != nil {
			return err
		}
	}

	srv := &http.Server{
		Addr:              ":" + cfg.HTTPPort,
		Handler:           server.NewRouter(cfg, pool),
		ReadHeaderTimeout: 5 * time.Second,
	}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()
	slog.Info("listening", "addr", srv.Addr, "env", cfg.AppEnv)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
