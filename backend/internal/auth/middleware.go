package auth

import (
	"context"
	"net/http"
	"slices"
	"strings"

	"tourism-is/backend/internal/platform/httpx"
)

type ctxKey struct{}

// Principal is the authenticated caller stored in the request context.
type Principal struct {
	UserID int64
	Role   string
}

// FromContext returns the authenticated principal, if any.
func FromContext(ctx context.Context) (Principal, bool) {
	p, ok := ctx.Value(ctxKey{}).(Principal)
	return p, ok
}

// RequireAuth rejects requests without a valid Bearer token.
func RequireAuth(m *JWTManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get("Authorization")
			tok, ok := strings.CutPrefix(h, "Bearer ")
			if !ok || tok == "" {
				httpx.WriteError(w, ErrUnauthorized)
				return
			}
			claims, err := m.Parse(tok)
			if err != nil {
				httpx.WriteError(w, ErrUnauthorized)
				return
			}
			id, err := claims.UserID()
			if err != nil {
				httpx.WriteError(w, ErrUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), ctxKey{}, Principal{UserID: id, Role: claims.Role})
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireRole allows only the given roles. Must be used after RequireAuth.
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			p, ok := FromContext(r.Context())
			if !ok {
				httpx.WriteError(w, ErrUnauthorized)
				return
			}
			if !slices.Contains(roles, p.Role) {
				httpx.WriteError(w, ErrForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
