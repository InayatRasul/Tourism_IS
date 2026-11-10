package auth

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"tourism-is/backend/internal/platform/httpx"
)

// Handler exposes auth endpoints over HTTP.
type Handler struct {
	svc *Service
	jwt *JWTManager
}

// NewHandler creates an auth HTTP handler.
func NewHandler(svc *Service, jwt *JWTManager) *Handler { return &Handler{svc: svc, jwt: jwt} }

// Routes mounts /auth/* routes.
func (h *Handler) Routes(r chi.Router) {
	r.Post("/auth/register", h.register)
	r.Post("/auth/login", h.login)
	r.With(RequireAuth(h.jwt)).Get("/auth/me", h.me)
}

func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	var in RegisterInput
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.WriteError(w, err)
		return
	}
	res, err := h.svc.Register(r.Context(), in)
	if err != nil {
		httpx.WriteError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, res)
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var in LoginInput
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.WriteError(w, err)
		return
	}
	res, err := h.svc.Login(r.Context(), in)
	if err != nil {
		httpx.WriteError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	p, _ := FromContext(r.Context())
	u, err := h.svc.Me(r.Context(), p.UserID)
	if err != nil {
		httpx.WriteError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, u)
}
