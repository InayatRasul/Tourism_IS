//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"tourism-is/backend/internal/config"
	"tourism-is/backend/internal/seed"
	"tourism-is/backend/internal/server"
)

func newAPIServer(t *testing.T) *httptest.Server {
	t.Helper()
	truncateAll(t)
	if err := seed.Run(context.Background(), testPool); err != nil {
		t.Fatal(err)
	}
	cfg := config.Config{
		AppEnv: "test", JWTSecret: "integration-secret", JWTTTL: time.Hour,
		DBTimeout: 2 * time.Second, CORSOrigins: []string{"http://localhost:3000"},
	}
	srv := httptest.NewServer(server.NewRouter(cfg, testPool))
	t.Cleanup(srv.Close)
	return srv
}

func call(t *testing.T, srv *httptest.Server, method, path, body, token string) (int, map[string]any) {
	t.Helper()
	req, _ := http.NewRequest(method, srv.URL+path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var m map[string]any
	_ = json.NewDecoder(res.Body).Decode(&m)
	return res.StatusCode, m
}

func TestAPIHealth(t *testing.T) {
	srv := newAPIServer(t)
	status, body := call(t, srv, http.MethodGet, "/api/v1/health", "", "")
	if status != 200 || body["db"] != "ok" {
		t.Fatalf("health = %d %v", status, body)
	}
}

func TestAPISeededAccountsCanLogIn(t *testing.T) {
	srv := newAPIServer(t)
	cases := []struct{ login, password, role string }{
		{"admin", "admin", "admin"},
		{"tourist@tis.kz", "Passw0rd!", "tourist"},
		{"guide@tis.kz", "Passw0rd!", "guide"},
		{"manager@tis.kz", "Passw0rd!", "agency_manager"},
	}
	for _, c := range cases {
		t.Run(c.login, func(t *testing.T) {
			status, body := call(t, srv, http.MethodPost, "/api/v1/auth/login",
				`{"email":"`+c.login+`","password":"`+c.password+`"}`, "")
			if status != 200 {
				t.Fatalf("login status = %d body = %v", status, body)
			}
			token := body["token"].(string)
			status, me := call(t, srv, http.MethodGet, "/api/v1/auth/me", "", token)
			if status != 200 || me["role"] != c.role {
				t.Fatalf("me = %d %v", status, me)
			}
		})
	}
}

func TestAPIRegisterLoginFlowPersistsUser(t *testing.T) {
	srv := newAPIServer(t)
	reg := `{"email":"Dana@Example.kz","password":"travel2026","full_name":"Dana K","phone":"+7 701 555 4433","role":"tourist"}`

	status, body := call(t, srv, http.MethodPost, "/api/v1/auth/register", reg, "")
	if status != 201 {
		t.Fatalf("register = %d %v", status, body)
	}

	// Stored normalised, hashed, not blocked.
	var email, phone, hash string
	var blocked bool
	if err := testPool.QueryRow(context.Background(),
		`SELECT email, phone, password_hash, is_blocked FROM users WHERE lower(email) = 'dana@example.kz'`).
		Scan(&email, &phone, &hash, &blocked); err != nil {
		t.Fatal(err)
	}
	if email != "dana@example.kz" || phone != "+77015554433" || blocked || !strings.HasPrefix(hash, "$2") {
		t.Fatalf("stored email=%q phone=%q blocked=%v hash=%q", email, phone, blocked, hash)
	}

	status, _ = call(t, srv, http.MethodPost, "/api/v1/auth/register", reg, "")
	if status != 409 {
		t.Fatalf("duplicate register = %d, want 409", status)
	}

	status, _ = call(t, srv, http.MethodPost, "/api/v1/auth/login", `{"email":"dana@example.kz","password":"travel2026"}`, "")
	if status != 200 {
		t.Fatalf("login = %d", status)
	}
	status, _ = call(t, srv, http.MethodPost, "/api/v1/auth/login", `{"email":"dana@example.kz","password":"wrong-pass1"}`, "")
	if status != 401 {
		t.Fatalf("wrong password = %d, want 401", status)
	}
}

func TestAPIBlockedUserCannotLogIn(t *testing.T) {
	srv := newAPIServer(t)
	_, body := call(t, srv, http.MethodPost, "/api/v1/auth/login", `{"email":"tourist@tis.kz","password":"Passw0rd!"}`, "")
	oldToken := body["token"].(string)

	if _, err := testPool.Exec(context.Background(), `UPDATE users SET is_blocked = true WHERE email = 'tourist@tis.kz'`); err != nil {
		t.Fatal(err)
	}
	status, body := call(t, srv, http.MethodPost, "/api/v1/auth/login", `{"email":"tourist@tis.kz","password":"Passw0rd!"}`, "")
	if status != 403 || body["code"] != "ACCOUNT_BLOCKED" {
		t.Fatalf("blocked login = %d %v (FR-38)", status, body)
	}
	// A token issued before blocking must stop working too.
	status, _ = call(t, srv, http.MethodGet, "/api/v1/auth/me", "", oldToken)
	if status != 403 {
		t.Fatalf("blocked user's old token: /me = %d, want 403", status)
	}
}
