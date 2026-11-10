//go:build integration

// Package integration contains tests that run against a real PostgreSQL
// database. They are excluded from `go test ./...` and run with:
//
//	TEST_DATABASE_URL=postgres://tis:tis@localhost:5432/tis_test?sslmode=disable \
//	  go test -tags=integration ./internal/integration/...
//
// or simply `make be-test-integration`.
package integration

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"tourism-is/backend/internal/platform/db"
)

var (
	testPool *pgxpool.Pool
	testURL  string
)

func TestMain(m *testing.M) {
	testURL = os.Getenv("TEST_DATABASE_URL")
	if testURL == "" {
		fmt.Println("TEST_DATABASE_URL not set — skipping integration tests")
		os.Exit(0)
	}
	if err := ensureTestDatabase(testURL); err != nil {
		fmt.Println("refusing to run:", err)
		os.Exit(1)
	}

	ctx := context.Background()
	if err := resetSchema(ctx, testURL); err != nil {
		fmt.Println("reset schema:", err)
		os.Exit(1)
	}
	if err := db.Migrate(testURL); err != nil {
		fmt.Println("migrate:", err)
		os.Exit(1)
	}
	var err error
	testPool, err = db.Connect(ctx, testURL, 2*time.Second)
	if err != nil {
		fmt.Println("connect:", err)
		os.Exit(1)
	}
	code := m.Run()
	testPool.Close()
	os.Exit(code)
}

// ensureTestDatabase guards against wiping the development database.
func ensureTestDatabase(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return err
	}
	name := strings.TrimPrefix(u.Path, "/")
	if !strings.HasSuffix(name, "_test") {
		return fmt.Errorf("database %q does not end with _test", name)
	}
	return nil
}

// resetSchema drops everything so migrations run from scratch.
func resetSchema(ctx context.Context, raw string) error {
	pool, err := db.Connect(ctx, raw, 2*time.Second)
	if err != nil {
		return err
	}
	defer pool.Close()
	if err := db.WaitReady(ctx, pool, 10, 2*time.Second); err != nil {
		return err
	}
	_, err = pool.Exec(ctx, `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`)
	return err
}

// truncateAll empties every domain table except the migration-seeded categories.
func truncateAll(t *testing.T) {
	t.Helper()
	_, err := testPool.Exec(context.Background(), `
		TRUNCATE notification_logs, reviews, payments, bookings, trip_days, trip_packages,
		         excursion_slots, itinerary_stops, excursions, agencies, users
		RESTART IDENTITY CASCADE`)
	if err != nil {
		t.Fatalf("truncate: %v", err)
	}
}
