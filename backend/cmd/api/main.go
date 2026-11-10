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

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"

	"tourism-is/backend/internal/auth"
	"tourism-is/backend/internal/config"
	"tourism-is/backend/internal/platform/db"
	"tourism-is/backend/internal/platform/httpx"
	"tourism-is/backend/internal/seed"
	"tourism-is/backend/internal/user"
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
		Handler:           newRouter(cfg, pool),
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

func newRouter(cfg config.Config, pool *pgxpool.Pool) http.Handler {
	jwtm := auth.NewJWTManager(cfg.JWTSecret, cfg.JWTTTL)
	authSvc := auth.NewService(user.NewRepository(pool), jwtm)
	authHandler := auth.NewHandler(authSvc, jwtm)

	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, httpx.Logger, middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: cfg.CORSOrigins,
		AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Authorization", "Content-Type"},
		MaxAge:         300,
	}))
	// Keep total request time under the 3 s NFR-02 budget.
	r.Use(httpx.Timeout(cfg.DBTimeout + 500*time.Millisecond))

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", healthHandler(pool, cfg.DBTimeout))
		authHandler.Routes(r)
	})
	r.NotFound(func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteError(w, httpx.NewError(http.StatusNotFound, httpx.CodeNotFound, "Route not found"))
	})
	return r
}

func healthHandler(pool *pgxpool.Pool, timeout time.Duration) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), timeout)
		defer cancel()
		if err := pool.Ping(ctx); err != nil {
			httpx.WriteJSON(w, http.StatusServiceUnavailable, httpx.NewError(http.StatusServiceUnavailable,
				httpx.CodeServiceUnavailable, "Database is unavailable"))
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok", "db": "ok"})
	}
}
