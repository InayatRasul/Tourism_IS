package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func okHandler(t *testing.T, gotPrincipal *Principal) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p, ok := FromContext(r.Context())
		if !ok {
			t.Error("principal missing from context")
		}
		if gotPrincipal != nil {
			*gotPrincipal = p
		}
		w.WriteHeader(http.StatusOK)
	})
}

func TestRequireAuth(t *testing.T) {
	m := NewJWTManager("secret", time.Hour)
	valid, _ := m.Issue(7, "guide")
	foreign, _ := NewJWTManager("other-secret", time.Hour).Issue(7, "admin")

	cases := []struct {
		name   string
		header string
		want   int
	}{
		{"no header", "", http.StatusUnauthorized},
		{"wrong scheme", "Basic abc", http.StatusUnauthorized},
		{"empty bearer", "Bearer ", http.StatusUnauthorized},
		{"garbage token", "Bearer not.a.jwt", http.StatusUnauthorized},
		{"token signed with other secret", "Bearer " + foreign, http.StatusUnauthorized},
		{"valid", "Bearer " + valid, http.StatusOK},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			var p Principal
			h := RequireAuth(m)(okHandler(t, &p))
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			if c.header != "" {
				req.Header.Set("Authorization", c.header)
			}
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			if rec.Code != c.want {
				t.Fatalf("status = %d, want %d (body %s)", rec.Code, c.want, rec.Body.String())
			}
			if c.want == http.StatusOK && (p.UserID != 7 || p.Role != "guide") {
				t.Fatalf("principal = %+v", p)
			}
		})
	}
}

func TestRequireRole(t *testing.T) {
	m := NewJWTManager("secret", time.Hour)
	cases := []struct {
		role string
		want int
	}{
		{"admin", http.StatusOK},
		{"tourist", http.StatusForbidden},
		{"guide", http.StatusForbidden},
	}
	for _, c := range cases {
		t.Run(c.role, func(t *testing.T) {
			tok, _ := m.Issue(1, c.role)
			h := RequireAuth(m)(RequireRole("admin")(okHandler(t, nil)))
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.Header.Set("Authorization", "Bearer "+tok)
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			if rec.Code != c.want {
				t.Fatalf("role %s: status = %d, want %d", c.role, rec.Code, c.want)
			}
		})
	}
}

func TestRequireRoleMultipleRoles(t *testing.T) {
	m := NewJWTManager("secret", time.Hour)
	for _, role := range []string{"guide", "agency_manager"} {
		tok, _ := m.Issue(1, role)
		h := RequireAuth(m)(RequireRole("guide", "agency_manager")(okHandler(t, nil)))
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer "+tok)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("role %s rejected: %d", role, rec.Code)
		}
	}
}

func TestRequireRoleWithoutAuthIs401(t *testing.T) {
	h := RequireRole("admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler must not run")
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
}
