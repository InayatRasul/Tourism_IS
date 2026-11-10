//go:build integration

package integration

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

// fixture holds IDs of a minimal valid object graph to build constraint tests on.
type fixture struct {
	touristID, guideID, managerID, agencyID, categoryID int64
	excursionID, slotID, tripID                         int64
}

func newFixture(t *testing.T) fixture {
	t.Helper()
	truncateAll(t)
	ctx := context.Background()
	var f fixture
	q := func(sql string, dst *int64, args ...any) {
		t.Helper()
		if err := testPool.QueryRow(ctx, sql, args...).Scan(dst); err != nil {
			t.Fatalf("fixture %q: %v", sql, err)
		}
	}
	q(`INSERT INTO users (email,password_hash,full_name,phone,role) VALUES ('t@tis.kz','x','T','+77000000001','tourist') RETURNING id`, &f.touristID)
	q(`INSERT INTO users (email,password_hash,full_name,phone,role) VALUES ('g@tis.kz','x','G','+77000000002','guide') RETURNING id`, &f.guideID)
	q(`INSERT INTO users (email,password_hash,full_name,phone,role) VALUES ('m@tis.kz','x','M','+77000000003','agency_manager') RETURNING id`, &f.managerID)
	q(`INSERT INTO agencies (manager_user_id,name,city,contact_email,contact_phone) VALUES ($1,'A','Almaty','a@a.kz','+77000000004') RETURNING id`, &f.agencyID, f.managerID)
	q(`SELECT id FROM categories ORDER BY id LIMIT 1`, &f.categoryID)
	q(`INSERT INTO excursions (owner_user_id,category_id,title,city,meeting_point,duration_minutes,base_price_minor)
	   VALUES ($1,$2,'E','Almaty','Park',60,100000) RETURNING id`, &f.excursionID, f.guideID, f.categoryID)
	q(`INSERT INTO excursion_slots (excursion_id,start_at,price_minor,max_participants)
	   VALUES ($1, now() + interval '3 days', 100000, 10) RETURNING id`, &f.slotID, f.excursionID)
	q(`INSERT INTO trip_packages (agency_id,category_id,title,destination,departure_at,return_at,price_per_person_minor,total_seats)
	   VALUES ($1,$2,'T','Kolsai', now() + interval '5 days', now() + interval '7 days', 500000, 8) RETURNING id`,
		&f.tripID, f.agencyID, f.categoryID)
	return f
}

// pgCode extracts the SQLSTATE code and constraint name from err.
func pgCode(err error) (code, constraint string) {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code, pgErr.ConstraintName
	}
	return "", ""
}

const (
	checkViolation  = "23514"
	uniqueViolation = "23505"
	fkViolation     = "23503"
	notNull         = "23502"
)

func TestMigrationsCreateAllTables(t *testing.T) {
	want := []string{
		"agencies", "bookings", "categories", "excursion_slots", "excursions", "itinerary_stops",
		"notification_logs", "payments", "reviews", "trip_days", "trip_packages", "users",
	}
	rows, err := testPool.Query(context.Background(),
		`SELECT table_name FROM information_schema.tables
		 WHERE table_schema = 'public' AND table_name <> 'schema_migrations' ORDER BY table_name`)
	if err != nil {
		t.Fatal(err)
	}
	var got []string
	for rows.Next() {
		var n string
		_ = rows.Scan(&n)
		got = append(got, n)
	}
	if len(got) != len(want) {
		t.Fatalf("tables = %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("tables = %v, want %v", got, want)
		}
	}
}

func TestMigrationSeedsCategories(t *testing.T) {
	var n int
	if err := testPool.QueryRow(context.Background(), `SELECT count(*) FROM categories WHERE is_active`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 6 {
		t.Fatalf("categories = %d, want 6", n)
	}
}

func TestSpecIndexesExist(t *testing.T) {
	// Spec §9.6 indexes that keep search under 3 s (NFR-01).
	for _, idx := range []string{
		"excursion_slots_start_idx", "excursions_city_cat_status_idx", "trip_packages_departure_status_idx",
		"bookings_tourist_idx", "bookings_slot_idx", "excursions_title_trgm_idx", "users_email_lower_uq",
	} {
		var exists bool
		if err := testPool.QueryRow(context.Background(),
			`SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname=$1)`, idx).Scan(&exists); err != nil {
			t.Fatal(err)
		}
		if !exists {
			t.Errorf("index %s missing", idx)
		}
	}
}

// TestConstraints checks that the database itself rejects invalid data,
// the "last line of defence" from spec §9.1 and §12.5.
func TestConstraints(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()

	cases := []struct {
		name           string
		sql            string
		args           []any
		wantCode       string
		wantConstraint string // optional
	}{
		// --- capacity (BR-04, NFR-04)
		{"slot overbooked", `UPDATE excursion_slots SET booked_seats = 11 WHERE id = $1`, []any{f.slotID}, checkViolation, "slot_capacity_chk"},
		{"slot negative seats", `UPDATE excursion_slots SET booked_seats = -1 WHERE id = $1`, []any{f.slotID}, checkViolation, "slot_capacity_chk"},
		{"slot max reduced below booked", `UPDATE excursion_slots SET booked_seats = 5, max_participants = 4 WHERE id = $1`, []any{f.slotID}, checkViolation, "slot_capacity_chk"},
		{"slot zero capacity", `INSERT INTO excursion_slots (excursion_id,start_at,price_minor,max_participants) VALUES ($1, now(), 0, 0)`, []any{f.excursionID}, checkViolation, ""},
		{"slot negative price", `INSERT INTO excursion_slots (excursion_id,start_at,price_minor,max_participants) VALUES ($1, now(), -1, 5)`, []any{f.excursionID}, checkViolation, ""},
		{"trip overbooked", `UPDATE trip_packages SET booked_seats = 9 WHERE id = $1`, []any{f.tripID}, checkViolation, "trip_capacity_chk"},
		{"trip returns before departure", `UPDATE trip_packages SET return_at = departure_at - interval '1 day' WHERE id = $1`, []any{f.tripID}, checkViolation, "trip_dates_chk"},

		// --- enums / ranges (BR-11)
		{"invalid role", `INSERT INTO users (email,password_hash,full_name,phone,role) VALUES ('x@x.kz','x','X','+77000000009','superuser')`, nil, checkViolation, ""},
		{"invalid excursion status", `UPDATE excursions SET status = 'deleted' WHERE id = $1`, []any{f.excursionID}, checkViolation, ""},
		{"negative base price", `UPDATE excursions SET base_price_minor = -5 WHERE id = $1`, []any{f.excursionID}, checkViolation, ""},
		{"zero duration", `UPDATE excursions SET duration_minutes = 0 WHERE id = $1`, []any{f.excursionID}, checkViolation, ""},
		{"invalid agency verification", `UPDATE agencies SET verification_status = 'maybe' WHERE id = $1`, []any{f.agencyID}, checkViolation, ""},

		// --- uniqueness
		{"email unique case-insensitive", `INSERT INTO users (email,password_hash,full_name,phone,role) VALUES ('T@TIS.KZ','x','T2','+77000000005','tourist')`, nil, uniqueViolation, "users_email_lower_uq"},
		{"one agency per manager", `INSERT INTO agencies (manager_user_id,name,city,contact_email,contact_phone) VALUES ($1,'B','Almaty','b@b.kz','+77000000006')`, []any{f.managerID}, uniqueViolation, ""},
		{"duplicate category", `INSERT INTO categories (name) VALUES ('City tour')`, nil, uniqueViolation, ""},
		{"duplicate stop position", `INSERT INTO itinerary_stops (excursion_id,position,title) VALUES ($1,1,'A'),($1,1,'B')`, []any{f.excursionID}, uniqueViolation, ""},

		// --- foreign keys
		{"slot for missing excursion", `INSERT INTO excursion_slots (excursion_id,start_at,price_minor,max_participants) VALUES (999999, now(), 0, 5)`, nil, fkViolation, ""},

		// --- booking target: exactly one of slot / package
		{"booking with both targets", `INSERT INTO bookings (reference_code,tourist_id,excursion_slot_id,trip_package_id,seats,total_amount_minor,contact_email,contact_phone)
			VALUES ('TIS-BOTH01',$1,$2,$3,1,100,'t@tis.kz','+77000000001')`, []any{f.touristID, f.slotID, f.tripID}, checkViolation, "booking_target_chk"},
		{"booking with no target", `INSERT INTO bookings (reference_code,tourist_id,seats,total_amount_minor,contact_email,contact_phone)
			VALUES ('TIS-NONE01',$1,1,100,'t@tis.kz','+77000000001')`, []any{f.touristID}, checkViolation, "booking_target_chk"},
		{"booking zero seats", `INSERT INTO bookings (reference_code,tourist_id,excursion_slot_id,seats,total_amount_minor,contact_email,contact_phone)
			VALUES ('TIS-ZERO01',$1,$2,0,100,'t@tis.kz','+77000000001')`, []any{f.touristID, f.slotID}, checkViolation, ""},
		{"booking without contact phone (BR-05)", `INSERT INTO bookings (reference_code,tourist_id,excursion_slot_id,seats,total_amount_minor,contact_email)
			VALUES ('TIS-NOPH01',$1,$2,1,100,'t@tis.kz')`, []any{f.touristID, f.slotID}, notNull, ""},
		{"booking invalid status", `INSERT INTO bookings (reference_code,tourist_id,excursion_slot_id,seats,total_amount_minor,contact_email,contact_phone,status)
			VALUES ('TIS-STAT01',$1,$2,1,100,'t@tis.kz','+77000000001','pending')`, []any{f.touristID, f.slotID}, checkViolation, ""},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			// Run each statement in a transaction we roll back, so cases stay independent.
			tx, err := testPool.Begin(ctx)
			if err != nil {
				t.Fatal(err)
			}
			defer func() { _ = tx.Rollback(ctx) }()

			_, err = tx.Exec(ctx, c.sql, c.args...)
			code, constraint := pgCode(err)
			if code != c.wantCode {
				t.Fatalf("got err %v (code %q), want SQLSTATE %s", err, code, c.wantCode)
			}
			if c.wantConstraint != "" && constraint != c.wantConstraint {
				t.Fatalf("constraint = %q, want %q", constraint, c.wantConstraint)
			}
		})
	}
}

func TestBookingPaymentReviewConstraints(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()

	var bookingID int64
	if err := testPool.QueryRow(ctx, `INSERT INTO bookings
		(reference_code,tourist_id,excursion_slot_id,seats,total_amount_minor,contact_email,contact_phone)
		VALUES ('TIS-AAAAAA',$1,$2,2,200000,'t@tis.kz','+77000000001') RETURNING id`,
		f.touristID, f.slotID).Scan(&bookingID); err != nil {
		t.Fatalf("valid booking rejected: %v", err)
	}

	expectCode := func(name, want string, sql string, args ...any) {
		t.Helper()
		tx, _ := testPool.Begin(ctx)
		defer func() { _ = tx.Rollback(ctx) }()
		_, err := tx.Exec(ctx, sql, args...)
		if code, _ := pgCode(err); code != want {
			t.Errorf("%s: err %v, want SQLSTATE %s", name, err, want)
		}
	}

	expectCode("duplicate reference code (FR-26)", uniqueViolation,
		`INSERT INTO bookings (reference_code,tourist_id,excursion_slot_id,seats,total_amount_minor,contact_email,contact_phone)
		 VALUES ('TIS-AAAAAA',$1,$2,1,100000,'t@tis.kz','+77000000001')`, f.touristID, f.slotID)

	if _, err := testPool.Exec(ctx, `INSERT INTO payments (booking_id,amount_minor,transaction_ref) VALUES ($1,200000,'MOCK-1')`, bookingID); err != nil {
		t.Fatalf("valid payment rejected: %v", err)
	}
	expectCode("second payment for booking", uniqueViolation,
		`INSERT INTO payments (booking_id,amount_minor,transaction_ref) VALUES ($1,200000,'MOCK-2')`, bookingID)
	expectCode("refund above amount", checkViolation,
		`UPDATE payments SET refunded_amount_minor = 300000 WHERE booking_id = $1`, bookingID)
	expectCode("invalid payment status", checkViolation,
		`UPDATE payments SET status = 'pending' WHERE booking_id = $1`, bookingID)
	expectCode("non-mock payment method (FR-27)", checkViolation,
		`UPDATE payments SET method = 'visa' WHERE booking_id = $1`, bookingID)

	if _, err := testPool.Exec(ctx, `INSERT INTO reviews (booking_id,tourist_id,excursion_id,rating) VALUES ($1,$2,$3,5)`,
		bookingID, f.touristID, f.excursionID); err != nil {
		t.Fatalf("valid review rejected: %v", err)
	}
	expectCode("second review per booking (BR-08)", uniqueViolation,
		`INSERT INTO reviews (booking_id,tourist_id,excursion_id,rating) VALUES ($1,$2,$3,4)`, bookingID, f.touristID, f.excursionID)
	expectCode("rating 6", checkViolation, `UPDATE reviews SET rating = 6 WHERE booking_id = $1`, bookingID)
	expectCode("rating 0", checkViolation, `UPDATE reviews SET rating = 0 WHERE booking_id = $1`, bookingID)
	expectCode("review with two targets", checkViolation,
		`UPDATE reviews SET trip_package_id = $2 WHERE booking_id = $1`, bookingID, f.tripID)
	expectCode("invalid notification status", checkViolation,
		`INSERT INTO notification_logs (booking_id,recipient_email,type,status) VALUES ($1,'t@tis.kz','booking_confirmed','queued')`, bookingID)

	// Deleting a booking cascades to its payment and review.
	if _, err := testPool.Exec(ctx, `DELETE FROM bookings WHERE id = $1`, bookingID); err != nil {
		t.Fatal(err)
	}
	var left int
	_ = testPool.QueryRow(ctx, `SELECT (SELECT count(*) FROM payments) + (SELECT count(*) FROM reviews)`).Scan(&left)
	if left != 0 {
		t.Fatalf("payment/review not cascaded: %d rows left", left)
	}
}
