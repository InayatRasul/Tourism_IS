//go:build integration

package integration

import (
	"context"
	"errors"
	"testing"

	"golang.org/x/crypto/bcrypt"

	"tourism-is/backend/internal/seed"
	"tourism-is/backend/internal/user"
)

func TestUserRepository(t *testing.T) {
	truncateAll(t)
	ctx := context.Background()
	repo := user.NewRepository(testPool)

	created, err := repo.Create(ctx, user.User{
		Email: "aru@tis.kz", PasswordHash: "hash", FullName: "Aru", Phone: "+77010000000", Role: user.RoleTourist,
	})
	if err != nil {
		t.Fatal(err)
	}
	if created.ID == 0 || created.CreatedAt.IsZero() || created.IsBlocked {
		t.Fatalf("created = %+v", created)
	}

	byEmail, err := repo.FindByEmail(ctx, "ARU@tis.kz")
	if err != nil || byEmail.ID != created.ID {
		t.Fatalf("FindByEmail case-insensitive: %v %+v", err, byEmail)
	}
	byID, err := repo.FindByID(ctx, created.ID)
	if err != nil || byID.Email != "aru@tis.kz" {
		t.Fatalf("FindByID: %v %+v", err, byID)
	}

	if _, err := repo.Create(ctx, user.User{
		Email: "Aru@TIS.kz", PasswordHash: "h", FullName: "Dup", Phone: "+77010000001", Role: user.RoleGuide,
	}); !errors.Is(err, user.ErrEmailTaken) {
		t.Fatalf("duplicate email: got %v, want ErrEmailTaken", err)
	}
	if _, err := repo.FindByEmail(ctx, "nobody@tis.kz"); !errors.Is(err, user.ErrNotFound) {
		t.Fatalf("missing email: got %v", err)
	}
	if _, err := repo.FindByID(ctx, 424242); !errors.Is(err, user.ErrNotFound) {
		t.Fatalf("missing id: got %v", err)
	}
}

func TestSeedCreatesDevDataAndIsIdempotent(t *testing.T) {
	truncateAll(t)
	ctx := context.Background()

	if err := seed.Run(ctx, testPool); err != nil {
		t.Fatal(err)
	}

	counts := func() map[string]int {
		m := map[string]int{}
		for _, tbl := range []string{"users", "agencies", "excursions", "itinerary_stops", "excursion_slots", "trip_packages", "trip_days"} {
			var n int
			if err := testPool.QueryRow(ctx, `SELECT count(*) FROM `+tbl).Scan(&n); err != nil {
				t.Fatal(err)
			}
			m[tbl] = n
		}
		return m
	}
	first := counts()
	want := map[string]int{"users": 4, "agencies": 1, "excursions": 3, "itinerary_stops": 9,
		"excursion_slots": 7, "trip_packages": 1, "trip_days": 3}
	for k, v := range want {
		if first[k] != v {
			t.Errorf("%s = %d, want %d", k, first[k], v)
		}
	}

	// Running again must not duplicate anything.
	if err := seed.Run(ctx, testPool); err != nil {
		t.Fatal(err)
	}
	second := counts()
	for k := range first {
		if first[k] != second[k] {
			t.Errorf("seed not idempotent: %s %d -> %d", k, first[k], second[k])
		}
	}

	// Admin login must be admin/admin with a bcrypt hash, never plain text.
	var hash, role string
	if err := testPool.QueryRow(ctx, `SELECT password_hash, role FROM users WHERE email = 'admin'`).Scan(&hash, &role); err != nil {
		t.Fatal(err)
	}
	if role != "admin" || hash == "admin" {
		t.Fatalf("admin role=%q hash stored as plain text=%v", role, hash == "admin")
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte("admin")) != nil {
		t.Fatal("admin password is not 'admin'")
	}

	// Sold Out demo slot (Lab04 acceptance: capacity 10, 10 booked) exists.
	var full int
	_ = testPool.QueryRow(ctx, `SELECT count(*) FROM excursion_slots WHERE max_participants = 10 AND booked_seats = 10 AND start_at > now()`).Scan(&full)
	if full != 1 {
		t.Fatalf("sold-out demo slots = %d, want 1", full)
	}

	// The seeded agency must be verified so its offers are bookable (BR-06).
	var status string
	_ = testPool.QueryRow(ctx, `SELECT verification_status FROM agencies`).Scan(&status)
	if status != "verified" {
		t.Fatalf("agency status = %q", status)
	}
}
