//go:build integration

package integration

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
)

// reserveSQL is the atomic seat-reservation statement from spec §9.1
// (documented in Attachments/03_DATABASE_SCHEMA.md) that Phase P5 will use.
const reserveSQL = `
	UPDATE excursion_slots
	   SET booked_seats = booked_seats + $1
	 WHERE id = $2
	   AND status = 'open'
	   AND start_at > now()
	   AND booked_seats + $1 <= max_participants`

// TestConcurrentLastSeat checks spec §12.7: two (here: 25) parallel requests
// for the last seat -> exactly one succeeds, capacity is never exceeded.
func TestConcurrentLastSeat(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	if _, err := testPool.Exec(ctx, `UPDATE excursion_slots SET booked_seats = 9 WHERE id = $1`, f.slotID); err != nil {
		t.Fatal(err)
	}

	const workers = 25
	var wg sync.WaitGroup
	var succeeded, failed atomic.Int32
	start := make(chan struct{})
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			tag, err := testPool.Exec(ctx, reserveSQL, 1, f.slotID)
			if err != nil {
				t.Errorf("reserve: %v", err)
				return
			}
			if tag.RowsAffected() == 1 {
				succeeded.Add(1)
			} else {
				failed.Add(1)
			}
		}()
	}
	close(start)
	wg.Wait()

	if succeeded.Load() != 1 || failed.Load() != workers-1 {
		t.Fatalf("succeeded=%d failed=%d, want exactly 1 success", succeeded.Load(), failed.Load())
	}
	var booked int
	_ = testPool.QueryRow(ctx, `SELECT booked_seats FROM excursion_slots WHERE id = $1`, f.slotID).Scan(&booked)
	if booked != 10 {
		t.Fatalf("booked_seats = %d, want 10", booked)
	}
}

// TestConcurrentMultiSeatNeverExceedsCapacity: many parallel requests for
// 3 seats each on a 10-seat slot can fill at most 9 seats (3 bookings).
func TestConcurrentMultiSeatNeverExceedsCapacity(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()

	var wg sync.WaitGroup
	var ok atomic.Int32
	start := make(chan struct{})
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			tag, err := testPool.Exec(ctx, reserveSQL, 3, f.slotID)
			if err == nil && tag.RowsAffected() == 1 {
				ok.Add(1)
			}
		}()
	}
	close(start)
	wg.Wait()

	var booked int
	_ = testPool.QueryRow(ctx, `SELECT booked_seats FROM excursion_slots WHERE id = $1`, f.slotID).Scan(&booked)
	if ok.Load() != 3 || booked != 9 {
		t.Fatalf("successful=%d booked=%d, want 3 bookings / 9 seats", ok.Load(), booked)
	}
}

func TestReservationRules(t *testing.T) {
	ctx := context.Background()
	cases := []struct {
		name  string
		setup string
		seats int
		want  int64 // rows affected
	}{
		{"open future slot with room", ``, 2, 1},
		{"full slot rejected (FR-02)", `UPDATE excursion_slots SET booked_seats = 10 WHERE id = $1`, 1, 0},
		{"too many seats rejected", `UPDATE excursion_slots SET booked_seats = 8 WHERE id = $1`, 3, 0},
		{"exact remaining seats accepted", `UPDATE excursion_slots SET booked_seats = 8 WHERE id = $1`, 2, 1},
		{"cancelled slot rejected (FR-25)", `UPDATE excursion_slots SET status = 'cancelled' WHERE id = $1`, 1, 0},
		{"started slot rejected (BR-07)", `UPDATE excursion_slots SET start_at = now() - interval '1 minute' WHERE id = $1`, 1, 0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			f := newFixture(t)
			if c.setup != "" {
				if _, err := testPool.Exec(ctx, c.setup, f.slotID); err != nil {
					t.Fatal(err)
				}
			}
			tag, err := testPool.Exec(ctx, reserveSQL, c.seats, f.slotID)
			if err != nil {
				t.Fatal(err)
			}
			if tag.RowsAffected() != c.want {
				t.Fatalf("rows affected = %d, want %d", tag.RowsAffected(), c.want)
			}
		})
	}
}

// TestAlternativeSlotsQuery checks the "Sold Out -> suggest alternatives"
// query (FR-21, UC-15) from Attachments/03_DATABASE_SCHEMA.md.
func TestAlternativeSlotsQuery(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	if _, err := testPool.Exec(ctx, `UPDATE excursion_slots SET booked_seats = 10 WHERE id = $1`, f.slotID); err != nil {
		t.Fatal(err)
	}
	var good1, good2 int64
	ins := `INSERT INTO excursion_slots (excursion_id,start_at,price_minor,max_participants,booked_seats,status)
	        VALUES ($1, now() + $2::interval, 100000, $3, $4, $5) RETURNING id`
	mustID := func(dst *int64, interval string, max, booked int, status string) {
		t.Helper()
		var id int64
		if err := testPool.QueryRow(ctx, ins, f.excursionID, interval, max, booked, status).Scan(&id); err != nil {
			t.Fatal(err)
		}
		if dst != nil {
			*dst = id
		}
	}
	mustID(&good2, "6 days", 10, 0, "open")
	mustID(&good1, "4 days", 10, 7, "open")   // 3 left: fits 2 seats
	mustID(nil, "5 days", 10, 9, "open")      // 1 left: too few
	mustID(nil, "7 days", 10, 0, "cancelled") // cancelled
	mustID(nil, "-1 days", 10, 0, "open")     // in the past

	rows, err := testPool.Query(ctx, `
		SELECT id FROM excursion_slots
		 WHERE excursion_id = $1 AND id <> $2 AND status = 'open'
		   AND start_at > now() AND (max_participants - booked_seats) >= $3
		 ORDER BY start_at ASC`, f.excursionID, f.slotID, 2)
	if err != nil {
		t.Fatal(err)
	}
	var got []int64
	for rows.Next() {
		var id int64
		_ = rows.Scan(&id)
		got = append(got, id)
	}
	if len(got) != 2 || got[0] != good1 || got[1] != good2 {
		t.Fatalf("alternatives = %v, want [%d %d] in date order", got, good1, good2)
	}
}
