package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"tourism-is/backend/internal/config"
	"tourism-is/backend/internal/platform/db"
)

// newDeadDBRouter builds the real router against a database address where
// nothing listens, to check NFR-02: fail fast with 503 instead of hanging.
func newDeadDBRouter(t *testing.T) http.Handler {
	t.Helper()
	cfg := config.Config{
		AppEnv:      "test",
		JWTSecret:   "secret",
		JWTTTL:      time.Hour,
		DBTimeout:   time.Second,
		CORSOrigins: []string{"http://localhost:3000"},
	}
	pool, err := db.Connect(context.Background(), "postgres://tis:tis@127.0.0.1:1/tis?sslmode=disable", cfg.DBTimeout)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	return NewRouter(cfg, pool)
}

func TestHealthReturns503FastWhenDatabaseDown(t *testing.T) {
	r := newDeadDBRouter(t)
	start := time.Now()
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/health", nil))
	elapsed := time.Since(start)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", rec.Code)
	}
	if elapsed >= 3*time.Second {
		t.Fatalf("health took %v, NFR-02 requires < 3s", elapsed)
	}
	var body map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	if body["code"] != "SERVICE_UNAVAILABLE" {
		t.Fatalf("body = %s", rec.Body.String())
	}
}

func TestLoginReturns503FastWhenDatabaseDown(t *testing.T) {
	r := newDeadDBRouter(t)
	start := time.Now()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login",
		strings.NewReader(`{"email":"admin","password":"admin"}`))
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503 (body %s)", rec.Code, rec.Body.String())
	}
	if elapsed := time.Since(start); elapsed >= 3*time.Second {
		t.Fatalf("login took %v, NFR-02 requires < 3s", elapsed)
	}
}

func TestUnknownRouteReturnsJSON404(t *testing.T) {
	r := newDeadDBRouter(t)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/does-not-exist", nil))
	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "NOT_FOUND") {
		t.Fatalf("status = %d body = %s", rec.Code, rec.Body.String())
	}
}

func TestCORS(t *testing.T) {
	r := newDeadDBRouter(t)
	preflight := func(origin string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodOptions, "/api/v1/auth/login", nil)
		req.Header.Set("Origin", origin)
		req.Header.Set("Access-Control-Request-Method", "POST")
		req.Header.Set("Access-Control-Request-Headers", "Content-Type")
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		return rec
	}
	if got := preflight("http://localhost:3000").Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
		t.Fatalf("allowed origin not echoed: %q", got)
	}
	if got := preflight("http://evil.example").Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("disallowed origin accepted: %q", got)
	}
}

func TestProtectedRouteRequiresToken(t *testing.T) {
	r := newDeadDBRouter(t)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil))
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
}
