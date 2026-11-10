# 03 — Database Schema & Transactional SQL Reference

The complete database schema is versioned in [`backend/migrations/000001_init_schema.up.sql`](../backend/migrations/000001_init_schema.up.sql) and applied automatically on backend startup.

---

## 1. Tables Overview (All 12 Entities from Spec §7)

| # | Table | Primary Purpose & Key Constraints |
|---|-------|-----------------------------------|
| 1 | `users` | Accounts with `UNIQUE (lower(email))`, `role IN ('tourist','guide','agency_manager','admin')`, `is_blocked` |
| 2 | `agencies` | `1:1` with manager (`manager_user_id UNIQUE`), `verification_status IN ('pending','verified','rejected')` |
| 3 | `categories` | Offer categories (`name UNIQUE`, `is_active`) |
| 4 | `excursions` | Single-trip activity templates owned by a guide or agency manager; stores `base_price_minor`, `avg_rating`, `review_count` |
| 5 | `itinerary_stops` | Ordered stops per excursion (`UNIQUE (excursion_id, position)`) |
| 6 | `excursion_slots` | Bookable occurrences with `CHECK (booked_seats >= 0 AND booked_seats <= max_participants)` |
| 7 | `trip_packages` | Multi-day agency packages with `CHECK (booked_seats >= 0 AND booked_seats <= total_seats)` and `CHECK (return_at >= departure_at)` |
| 8 | `trip_days` | Ordered day-by-day descriptions (`UNIQUE (trip_package_id, day_number)`) |
| 9 | `bookings` | Tourist reservations with `reference_code UNIQUE` and `CHECK (num_nonnulls(excursion_slot_id, trip_package_id) = 1)` |
| 10 | `payments` | `1:1` with `bookings` (`booking_id UNIQUE`), `status IN ('paid','refunded','released_to_provider')` |
| 11 | `reviews` | `1:0..1` with `bookings` (`booking_id UNIQUE`), `rating BETWEEN 1 AND 5` |
| 12 | `notification_logs` | Email delivery audit trail (`status IN ('pending','sent','failed')`, `attempts`) |

---

## 2. Core Transactional SQL Patterns (For Phases P5 & P6)

### 2.1 Atomic Excursion Slot Seat Reservation (FR-02, FR-24, NFR-04)
```sql
UPDATE excursion_slots
   SET booked_seats = booked_seats + $1
 WHERE id = $2
   AND status = 'open'
   AND start_at > now()
   AND booked_seats + $1 <= max_participants
RETURNING id, excursion_id, start_at, price_minor, max_participants, booked_seats;
```
- If `0 rows` are returned, rollback and query alternative open slots:
```sql
SELECT id, start_at, price_minor, max_participants, booked_seats
  FROM excursion_slots
 WHERE excursion_id = $1
   AND id <> $2
   AND status = 'open'
   AND start_at > now()
   AND (max_participants - booked_seats) >= $3
 ORDER BY start_at ASC;
```

### 2.2 Tourist Cancellation & 24-Hour Refund Rule (BR-01, FR-30, FR-31)
```sql
-- 1. Return seats to availability (BR-10 / FR-31)
UPDATE excursion_slots
   SET booked_seats = booked_seats - $1
 WHERE id = $2;

-- 2. Update booking status
UPDATE bookings
   SET status = 'cancelled_by_tourist',
       cancelled_at = now()
 WHERE id = $3 AND status = 'confirmed';

-- 3. Update payment: 'refunded' if (departure_at - now() >= interval '24 hours') else 'released_to_provider'
UPDATE payments
   SET status = $4,
       refunded_amount_minor = $5,
       updated_at = now()
 WHERE booking_id = $3;
```
