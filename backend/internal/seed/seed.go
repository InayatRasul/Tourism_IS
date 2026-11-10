// Package seed inserts development data (users, agency, sample offers).
// It runs only when APP_ENV=dev and only once (skipped if the admin exists).
package seed

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"tourism-is/backend/internal/platform/db"
)

// Dev credentials (development only!).
const (
	AdminLogin    = "admin"
	AdminPassword = "admin"
	DevPassword   = "Passw0rd!"
)

// Run seeds the database if it has not been seeded yet.
func Run(ctx context.Context, pool *pgxpool.Pool) error {
	var exists bool
	if err := pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM users WHERE lower(email) = $1)`, AdminLogin).
		Scan(&exists); err != nil {
		return err
	}
	if exists {
		slog.Info("seed: already applied, skipping")
		return nil
	}

	adminHash, err := bcrypt.GenerateFromPassword([]byte(AdminPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	devHash, err := bcrypt.GenerateFromPassword([]byte(DevPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	err = db.WithTx(ctx, pool, func(tx pgx.Tx) error {
		insUser := func(email, hash, name, phone, role string) (int64, error) {
			var id int64
			err := tx.QueryRow(ctx, `INSERT INTO users (email, password_hash, full_name, phone, role)
				VALUES ($1,$2,$3,$4,$5) RETURNING id`, email, hash, name, phone, role).Scan(&id)
			return id, err
		}
		if _, err := insUser(AdminLogin, string(adminHash), "Platform Admin", "+77000000000", "admin"); err != nil {
			return fmt.Errorf("admin: %w", err)
		}
		guideID, err := insUser("guide@tis.kz", string(devHash), "Aidar Guide", "+77011112233", "guide")
		if err != nil {
			return err
		}
		managerID, err := insUser("manager@tis.kz", string(devHash), "Madina Manager", "+77022223344", "agency_manager")
		if err != nil {
			return err
		}
		if _, err := insUser("tourist@tis.kz", string(devHash), "Timur Tourist", "+77033334455", "tourist"); err != nil {
			return err
		}

		var agencyID int64
		if err := tx.QueryRow(ctx, `INSERT INTO agencies
			(manager_user_id, name, description, city, contact_email, contact_phone, verification_status)
			VALUES ($1, 'Steppe Explorers', 'Small local agency for trips across Kazakhstan.', 'Almaty',
			        'info@steppe.kz', '+77272223344', 'verified') RETURNING id`, managerID).Scan(&agencyID); err != nil {
			return fmt.Errorf("agency: %w", err)
		}

		catID := func(name string) (int64, error) {
			var id int64
			err := tx.QueryRow(ctx, `SELECT id FROM categories WHERE name = $1`, name).Scan(&id)
			return id, err
		}

		type stop struct{ title, desc string }
		insExcursion := func(owner int64, agency *int64, cat, title, desc, city, meet string, dur int, price int64, stops []stop) (int64, error) {
			cid, err := catID(cat)
			if err != nil {
				return 0, err
			}
			var id int64
			if err := tx.QueryRow(ctx, `INSERT INTO excursions
				(owner_user_id, agency_id, category_id, title, description, city, meeting_point,
				 duration_minutes, base_price_minor, status)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'published') RETURNING id`,
				owner, agency, cid, title, desc, city, meet, dur, price).Scan(&id); err != nil {
				return 0, err
			}
			for i, s := range stops {
				if _, err := tx.Exec(ctx, `INSERT INTO itinerary_stops (excursion_id, position, title, description)
					VALUES ($1,$2,$3,$4)`, id, i+1, s.title, s.desc); err != nil {
					return 0, err
				}
			}
			return id, nil
		}
		insSlot := func(exc int64, start time.Time, price int64, maxP, booked int) error {
			_, err := tx.Exec(ctx, `INSERT INTO excursion_slots (excursion_id, start_at, price_minor, max_participants, booked_seats)
				VALUES ($1,$2,$3,$4,$5)`, exc, start, price, maxP, booked)
			return err
		}

		day := func(d, h int) time.Time {
			base := time.Now().UTC().Truncate(24 * time.Hour)
			return base.AddDate(0, 0, d).Add(time.Duration(h) * time.Hour) // UTC hour
		}

		e1, err := insExcursion(guideID, nil, "Nature & Hiking", "Big Almaty Lake Hike",
			"A guided hike to the turquoise Big Almaty Lake in the Trans-Ili Alatau.", "Almaty",
			"Sayran bus station", 360, 1500000, []stop{
				{"Meet at Sayran", "Group gathering and briefing"},
				{"Ozerny checkpoint", "Short rest and photos"},
				{"Big Almaty Lake", "Free time at the lake"},
			})
		if err != nil {
			return err
		}
		e2, err := insExcursion(guideID, nil, "City tour", "Old Almaty Walking Tour",
			"Walk through Panfilov Park, Zenkov Cathedral and the Green Bazaar.", "Almaty",
			"Panfilov Park main gate", 180, 800000, []stop{
				{"Panfilov Park", "History of the park"},
				{"Zenkov Cathedral", "Wooden cathedral built without nails"},
				{"Green Bazaar", "Local food tasting"},
			})
		if err != nil {
			return err
		}
		e3, err := insExcursion(managerID, &agencyID, "Adventure", "Charyn Canyon Day Trip",
			"Full-day trip to the Valley of Castles in Charyn Canyon.", "Almaty",
			"Hotel Kazakhstan entrance", 720, 2500000, []stop{
				{"Departure", "Comfortable minibus from Almaty"},
				{"Valley of Castles", "Guided canyon walk"},
				{"Charyn River", "Lunch by the river"},
			})
		if err != nil {
			return err
		}

		// 02:00 UTC = 08:00 Almaty.
		for _, s := range []struct {
			exc          int64
			d, h         int
			price        int64
			maxP, booked int
		}{
			{e1, 3, 2, 1500000, 10, 10}, // full — Sold Out demo (Lab04 acceptance)
			{e1, 5, 2, 1500000, 10, 4},
			{e1, 7, 2, 1500000, 10, 0},
			{e2, 2, 5, 800000, 15, 3},
			{e2, 4, 5, 800000, 15, 0},
			{e3, 6, 1, 2500000, 12, 5},
			{e3, 13, 1, 2500000, 12, 0},
		} {
			if err := insSlot(s.exc, day(s.d, s.h), s.price, s.maxP, s.booked); err != nil {
				return err
			}
		}

		tripCat, err := catID("Multi-day trip")
		if err != nil {
			return err
		}
		var tripID int64
		if err := tx.QueryRow(ctx, `INSERT INTO trip_packages
			(agency_id, category_id, title, description, destination, departure_at, return_at,
			 price_per_person_minor, total_seats, booked_seats, included_services, status)
			VALUES ($1,$2,'Kolsai & Kaindy Lakes 3 Days','Three days in the mountain lakes region.',
			        'Kolsai Lakes', $3, $4, 12000000, 16, 6,
			        'Transport, guesthouse accommodation, breakfasts, guide', 'published') RETURNING id`,
			agencyID, tripCat, day(10, 2), day(12, 14)).Scan(&tripID); err != nil {
			return fmt.Errorf("trip: %w", err)
		}
		for i, d := range []stop{
			{"Almaty → Saty village", "Drive via Charyn Canyon, check-in at guesthouse"},
			{"Kaindy & Kolsai", "Sunken forest of Kaindy, hike at Kolsai-1"},
			{"Return to Almaty", "Morning at the lake, drive back"},
		} {
			if _, err := tx.Exec(ctx, `INSERT INTO trip_days (trip_package_id, day_number, title, description)
				VALUES ($1,$2,$3,$4)`, tripID, i+1, d.title, d.desc); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("seed: %w", err)
	}
	slog.Info("seed: dev data inserted", "admin_login", AdminLogin)
	return nil
}
