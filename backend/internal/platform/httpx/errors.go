// Package httpx contains shared HTTP helpers: JSON responses, API errors and middleware.
package httpx

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
)

// Standard error codes (spec §12.3).
const (
	CodeValidation         = "VALIDATION_ERROR"
	CodeUnauthorized       = "UNAUTHORIZED"
	CodeForbidden          = "FORBIDDEN"
	CodeNotFound           = "NOT_FOUND"
	CodeConflict           = "CONFLICT"
	CodeServiceUnavailable = "SERVICE_UNAVAILABLE"
	CodeInternal           = "INTERNAL_ERROR"
)

// APIError is a typed error that maps to a JSON error response.
type APIError struct {
	Status  int               `json:"-"`
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Details map[string]string `json:"details,omitempty"`
}

func (e *APIError) Error() string { return e.Code + ": " + e.Message }

// NewError constructs an APIError.
func NewError(status int, code, msg string) *APIError {
	return &APIError{Status: status, Code: code, Message: msg}
}

// ValidationError builds a 400 error with per-field details.
func ValidationError(details map[string]string) *APIError {
	return &APIError{Status: http.StatusBadRequest, Code: CodeValidation,
		Message: "Some fields are invalid", Details: details}
}

// WriteJSON writes v as JSON with the given status.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

// WriteError writes err as a JSON error. Unknown errors become 500, and
// database connectivity errors become 503 SERVICE_UNAVAILABLE.
func WriteError(w http.ResponseWriter, err error) {
	var apiErr *APIError
	if errors.As(err, &apiErr) {
		WriteJSON(w, apiErr.Status, apiErr)
		return
	}
	if IsUnavailable(err) {
		WriteJSON(w, http.StatusServiceUnavailable, NewError(http.StatusServiceUnavailable,
			CodeServiceUnavailable, "Service is temporarily unavailable. Please try again later."))
		return
	}
	slog.Error("internal error", "err", err)
	WriteJSON(w, http.StatusInternalServerError, NewError(http.StatusInternalServerError,
		CodeInternal, "Unexpected server error"))
}

// DecodeJSON decodes the request body into dst, rejecting unknown fields.
func DecodeJSON(r *http.Request, dst any) error {
	dec := json.NewDecoder(http.MaxBytesReader(nil, r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return NewError(http.StatusBadRequest, CodeValidation, "Invalid JSON body")
	}
	return nil
}
