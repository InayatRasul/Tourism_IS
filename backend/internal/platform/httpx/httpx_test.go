package httpx

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

func decodeBody(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var m map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &m); err != nil {
		t.Fatalf("invalid JSON body %q: %v", rec.Body.String(), err)
	}
	return m
}

func TestWriteJSON(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteJSON(rec, http.StatusCreated, map[string]string{"a": "b"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("content-type = %q", ct)
	}
	if decodeBody(t, rec)["a"] != "b" {
		t.Fatalf("body = %s", rec.Body.String())
	}
}

func TestWriteErrorAPIError(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteError(rec, ValidationError(map[string]string{"email": "bad"}))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d", rec.Code)
	}
	body := decodeBody(t, rec)
	if body["code"] != CodeValidation {
		t.Fatalf("code = %v", body["code"])
	}
	details, _ := body["details"].(map[string]any)
	if details["email"] != "bad" {
		t.Fatalf("details = %v", body["details"])
	}
}

func TestWriteErrorWrappedAPIError(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteError(rec, fmt.Errorf("wrapped: %w", NewError(http.StatusConflict, CodeConflict, "dup")))
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want 409", rec.Code)
	}
}

func TestWriteErrorUnavailableIs503(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteError(rec, fmt.Errorf("query: %w", context.DeadlineExceeded))
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", rec.Code)
	}
	if decodeBody(t, rec)["code"] != CodeServiceUnavailable {
		t.Fatalf("body = %s", rec.Body.String())
	}
}

func TestWriteErrorUnknownIs500WithoutLeakingDetails(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteError(rec, errors.New("secret internal detail"))
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d", rec.Code)
	}
	if strings.Contains(rec.Body.String(), "secret") {
		t.Fatalf("internal error leaked to client: %s", rec.Body.String())
	}
}

func TestIsUnavailable(t *testing.T) {
	cases := []struct {
		name string
		err  error
		want bool
	}{
		{"nil", nil, false},
		{"deadline", context.DeadlineExceeded, true},
		{"wrapped deadline", fmt.Errorf("x: %w", context.DeadlineExceeded), true},
		{"connection exception 08006", &pgconn.PgError{Code: "08006"}, true},
		{"admin shutdown 57P01", &pgconn.PgError{Code: "57P01"}, true},
		{"unique violation 23505", &pgconn.PgError{Code: "23505"}, false},
		{"check violation 23514", &pgconn.PgError{Code: "23514"}, false},
		{"plain error", errors.New("boom"), false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := IsUnavailable(c.err); got != c.want {
				t.Fatalf("IsUnavailable(%v) = %v, want %v", c.err, got, c.want)
			}
		})
	}
}

func TestDecodeJSON(t *testing.T) {
	type payload struct {
		Email string `json:"email"`
	}
	cases := []struct {
		name    string
		body    string
		wantErr bool
	}{
		{"valid", `{"email":"a@b.kz"}`, false},
		{"unknown field rejected", `{"email":"a@b.kz","role":"admin2"}`, true},
		{"malformed", `{"email":`, true},
		{"empty", ``, true},
		{"too large", `{"email":"` + strings.Repeat("a", 2<<20) + `"}`, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(c.body))
			var p payload
			err := DecodeJSON(r, &p)
			if (err != nil) != c.wantErr {
				t.Fatalf("err = %v, wantErr %v", err, c.wantErr)
			}
			var apiErr *APIError
			if err != nil && (!errors.As(err, &apiErr) || apiErr.Status != http.StatusBadRequest) {
				t.Fatalf("want 400 APIError, got %v", err)
			}
		})
	}
}

func TestTimeoutMiddlewareSetsDeadline(t *testing.T) {
	var deadline time.Time
	var ok bool
	h := Timeout(2 * time.Second)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deadline, ok = r.Context().Deadline()
	}))
	start := time.Now()
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))
	if !ok {
		t.Fatal("request context has no deadline")
	}
	if d := deadline.Sub(start); d <= 0 || d > 2*time.Second+100*time.Millisecond {
		t.Fatalf("deadline in %v, want ~2s", d)
	}
}
