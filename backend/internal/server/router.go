// Package server wires HTTP routes and middleware into a single handler.
// It lives outside cmd/api so integration tests can start the real router.
package server

import (
	"context"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"

	"tourism-is/backend/internal/auth"
	"tourism-is/backend/internal/config"
	"tourism-is/backend/internal/platform/httpx"
	"tourism-is/backend/internal/user"
)

// NewRouter builds the full API handler.
func NewRouter(cfg config.Config, pool *pgxpool.Pool) http.Handler {
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
		r.Get("/health", HealthHandler(pool, cfg.DBTimeout))
		authHandler.Routes(r)
	})
	r.NotFound(func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteError(w, httpx.NewError(http.StatusNotFound, httpx.CodeNotFound, "Route not found"))
	})
	return r
}

// HealthHandler pings the database and reports 200 or 503 (NFR-02).
func HealthHandler(pool *pgxpool.Pool, timeout time.Duration) http.HandlerFunc {
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
