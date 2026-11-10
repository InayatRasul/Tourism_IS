package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"tourism-is/backend/internal/user"
)

// errStore simulates a database that is down: every call times out.
type errStore struct{}

func (errStore) Create(context.Context, user.User) (user.User, error) {
	return user.User{}, context.DeadlineExceeded
}
func (errStore) FindByEmail(context.Context, string) (user.User, error) {
	return user.User{}, context.DeadlineExceeded
}
func (errStore) FindByID(context.Context, int64) (user.User, error) {
	return user.User{}, context.DeadlineExceeded
}

type testAPI struct {
	router http.Handler
	store  *fakeStore
	jwt    *JWTManager
}

func newTestAPI(t *testing.T) *testAPI {
	t.Helper()
	svc, st := newTestService()
	r := chi.NewRouter()
	NewHandler(svc, svc.jwt).Routes(r)
	return &testAPI{router: r, store: st, jwt: svc.jwt}
}

func (a *testAPI) do(t *testing.T, method, path, body, token string) (*httptest.ResponseRecorder, map[string]any) {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	a.router.ServeHTTP(rec, req)
	var m map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &m)
	return rec, m
}

const validRegisterBody = `{"email":"bob@tis.kz","password":"secret123","full_name":"Bob Builder","phone":"+77011234567","role":"guide"}`

func TestHandlerRegister(t *testing.T) {
	api := newTestAPI(t)
	rec, body := api.do(t, http.MethodPost, "/auth/register", validRegisterBody, "")
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d body = %s", rec.Code, rec.Body.String())
	}
	if tok, _ := body["token"].(string); tok == "" {
		t.Fatal("token missing")
	}
	u, _ := body["user"].(map[string]any)
	if u["email"] != "bob@tis.kz" || u["role"] != "guide" {
		t.Fatalf("user = %v", u)
	}
	if strings.Contains(rec.Body.String(), "password") || strings.Contains(rec.Body.String(), "$2a$") {
		t.Fatalf("response leaks password data: %s", rec.Body.String())
	}
}

func TestHandlerRegisterValidationDetails(t *testing.T) {
	api := newTestAPI(t)
	rec, body := api.do(t, http.MethodPost, "/auth/register",
		`{"email":"nope","password":"short","full_name":"B","phone":"12","role":"admin"}`, "")
	if rec.Code != http.StatusBadRequest || body["code"] != "VALIDATION_ERROR" {
		t.Fatalf("status = %d body = %s", rec.Code, rec.Body.String())
	}
	details, _ := body["details"].(map[string]any)
	for _, f := range []string{"email", "password", "full_name", "phone", "role"} {
		if _, ok := details[f]; !ok {
			t.Errorf("missing validation detail for %q: %v", f, details)
		}
	}
}

func TestHandlerRegisterCannotBecomeAdmin(t *testing.T) {
	api := newTestAPI(t)
	rec, _ := api.do(t, http.MethodPost, "/auth/register",
		`{"email":"evil@tis.kz","password":"secret123","full_name":"Evil","phone":"+77011234567","role":"admin"}`, "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("admin self-registration allowed: %d", rec.Code)
	}
}

func TestHandlerRegisterRejectsUnknownFields(t *testing.T) {
	api := newTestAPI(t)
	rec, _ := api.do(t, http.MethodPost, "/auth/register",
		`{"email":"x@tis.kz","password":"secret123","full_name":"X Y","phone":"+77011234567","role":"tourist","is_blocked":false}`, "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestHandlerRegisterDuplicate(t *testing.T) {
	api := newTestAPI(t)
	api.do(t, http.MethodPost, "/auth/register", validRegisterBody, "")
	rec, body := api.do(t, http.MethodPost, "/auth/register",
		strings.Replace(validRegisterBody, "bob@tis.kz", "BOB@TIS.KZ", 1), "")
	if rec.Code != http.StatusConflict || body["code"] != "EMAIL_TAKEN" {
		t.Fatalf("status = %d body = %s", rec.Code, rec.Body.String())
	}
}

func TestHandlerLoginAndMe(t *testing.T) {
	api := newTestAPI(t)
	api.do(t, http.MethodPost, "/auth/register", validRegisterBody, "")

	rec, body := api.do(t, http.MethodPost, "/auth/login", `{"email":" Bob@tis.kz ","password":"secret123"}`, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("login status = %d body = %s", rec.Code, rec.Body.String())
	}
	tok := body["token"].(string)

	rec, me := api.do(t, http.MethodGet, "/auth/me", "", tok)
	if rec.Code != http.StatusOK || me["email"] != "bob@tis.kz" {
		t.Fatalf("me status = %d body = %s", rec.Code, rec.Body.String())
	}
}

func TestHandlerLoginFailures(t *testing.T) {
	api := newTestAPI(t)
	api.do(t, http.MethodPost, "/auth/register", validRegisterBody, "")

	cases := []struct {
		name, body string
		status     int
		code       string
	}{
		{"wrong password", `{"email":"bob@tis.kz","password":"wrong999"}`, 401, "INVALID_CREDENTIALS"},
		{"unknown user", `{"email":"ghost@tis.kz","password":"secret123"}`, 401, "INVALID_CREDENTIALS"},
		{"empty fields", `{"email":"","password":""}`, 401, "INVALID_CREDENTIALS"},
		{"malformed json", `{"email":`, 400, "VALIDATION_ERROR"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			rec, body := api.do(t, http.MethodPost, "/auth/login", c.body, "")
			if rec.Code != c.status || body["code"] != c.code {
				t.Fatalf("status = %d body = %s", rec.Code, rec.Body.String())
			}
		})
	}
}

func TestHandlerLoginBlockedUser(t *testing.T) {
	api := newTestAPI(t)
	api.do(t, http.MethodPost, "/auth/register", validRegisterBody, "")
	u := api.store.byEmail["bob@tis.kz"]
	u.IsBlocked = true
	api.store.byEmail["bob@tis.kz"] = u

	rec, body := api.do(t, http.MethodPost, "/auth/login", `{"email":"bob@tis.kz","password":"secret123"}`, "")
	if rec.Code != http.StatusForbidden || body["code"] != "ACCOUNT_BLOCKED" {
		t.Fatalf("status = %d body = %s", rec.Code, rec.Body.String())
	}
}

func TestHandlerMeBlockedAfterTokenIssued(t *testing.T) {
	api := newTestAPI(t)
	_, body := api.do(t, http.MethodPost, "/auth/register", validRegisterBody, "")
	tok := body["token"].(string)

	u := api.store.byEmail["bob@tis.kz"]
	u.IsBlocked = true
	api.store.byEmail["bob@tis.kz"] = u

	rec, _ := api.do(t, http.MethodGet, "/auth/me", "", tok)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("blocked user still served by /me: %d", rec.Code)
	}
}

func TestHandlerMeUnauthorized(t *testing.T) {
	api := newTestAPI(t)
	rec, _ := api.do(t, http.MethodGet, "/auth/me", "", "")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d", rec.Code)
	}
	// Valid signature but user no longer exists.
	tok, _ := api.jwt.Issue(9999, "tourist")
	rec, _ = api.do(t, http.MethodGet, "/auth/me", "", tok)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("deleted user: status = %d", rec.Code)
	}
}

func TestHandlerDatabaseDownReturns503(t *testing.T) {
	jwtm := NewJWTManager("secret", time.Hour)
	r := chi.NewRouter()
	NewHandler(NewService(errStore{}, jwtm), jwtm).Routes(r)

	for _, c := range []struct{ method, path, body string }{
		{http.MethodPost, "/auth/login", `{"email":"a@b.kz","password":"secret123"}`},
		{http.MethodPost, "/auth/register", validRegisterBody},
	} {
		req := httptest.NewRequest(c.method, c.path, strings.NewReader(c.body))
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		if rec.Code != http.StatusServiceUnavailable || !strings.Contains(rec.Body.String(), "SERVICE_UNAVAILABLE") {
			t.Fatalf("%s: status = %d body = %s", c.path, rec.Code, rec.Body.String())
		}
	}
}
