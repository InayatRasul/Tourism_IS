package httpx

import (
	"context"
	"errors"
	"net"

	"github.com/jackc/pgx/v5/pgconn"
)

// IsUnavailable reports whether err indicates the database (or another
// dependency) is unreachable or timed out, which maps to HTTP 503 (NFR-02).
func IsUnavailable(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	var netErr net.Error
	if errors.As(err, &netErr) {
		return true
	}
	var connErr *pgconn.ConnectError
	if errors.As(err, &connErr) {
		return true
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		// Class 08 — connection exception; 57P0x — admin/crash shutdown.
		if len(pgErr.Code) >= 2 && pgErr.Code[:2] == "08" {
			return true
		}
		switch pgErr.Code {
		case "57P01", "57P02", "57P03":
			return true
		}
	}
	return false
}
