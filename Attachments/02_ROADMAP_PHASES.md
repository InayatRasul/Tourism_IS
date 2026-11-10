# 02 — Phased Implementation Roadmap

## Milestone 1 (Completed in Session 1): Database + Real Auth + Full UI/UX

### Phase P0 — Repository & Docker Compose Infrastructure
- [x] Monorepo structure (`backend/`, `frontend/`, `Attachments/`, `docker-compose.yml`, `Makefile`, `.env.example`)
- [x] Multi-stage `backend/Dockerfile` (Go build → Alpine runtime)
- [x] Multi-stage `frontend/Dockerfile` (Node 22 Vite build → Nginx SPA + `/api/` reverse proxy)
- [x] `GET /api/v1/health` with PostgreSQL ping and `< 3s` 503 fallback (NFR-02)

### Phase P1 — Complete PostgreSQL Schema & Dev Seed
- [x] `000001_init_schema.up.sql` creating all 12 tables: `users`, `agencies`, `categories`, `excursions`, `itinerary_stops`, `excursion_slots`, `trip_packages`, `trip_days`, `bookings`, `payments`, `reviews`, `notification_logs`
- [x] Database-level `CHECK` constraints (`slot_capacity_chk`, `trip_capacity_chk`, `booking_target_chk`, `review_target_chk`, rating 1–5)
- [x] Performance indexes on slots, excursions, trip packages, bookings, and `pg_trgm` title indexes (NFR-01, §9.6)
- [x] `000002_seed_categories.up.sql` and Go dev seed (`admin` / `admin`, `guide@tis.kz`, `manager@tis.kz`, `tourist@tis.kz`, verified agency, 3 excursions with a 10/10 Sold Out slot, 1 multi-day trip package)

### Phase P2 — Registration, Login, JWT & Role Guards + Complete UI/UX
- [x] `POST /api/v1/auth/register` with validation and bcrypt password hashing (FR-04)
- [x] `POST /api/v1/auth/login` supporting `admin` / `admin` and email accounts, blocking `is_blocked` users (FR-05, FR-38)
- [x] `GET /api/v1/auth/me` + `RequireAuth` & `RequireRole` middlewares
- [x] Unit tests in `backend/internal/auth/service_test.go`
- [x] Public UI pages: Excursion Search & Filters (`/`), Excursion Details (`/excursions/:id`), Trip Packages (`/trips`, `/trips/:id`), Login (`/login`), Register (`/register`), Service Unavailable (`/unavailable`)
- [x] Tourist UI pages: Checkout with Sold Out + alternatives & mock payment token (`/checkout/:kind/:id`), My Bookings with 24h refund rule & review form (`/me/bookings`), Profile (`/me`)
- [x] Provider UI pages (`/provider`): Excursion & Itinerary builder, Slot manager (add/reschedule/cancel), Participant roster, Trip Packages manager, Agency Profile
- [x] Admin UI pages (`/admin`): Overview KPIs, User block/unblock, Agency verification, Category manager, All Bookings ledger

---

## Remaining Backend API Phases (For Next Sessions)

### Phase P3 — Profile, Agency & Excursion/Slot CRUD API
- [ ] `PUT /api/v1/me` (update profile & password, FR-06)
- [ ] `POST/PUT /api/v1/agencies` & `GET /api/v1/agencies/me` (FR-07)
- [ ] `POST/PUT /api/v1/excursions`, `POST /api/v1/excursions/{id}/publish` (FR-01, FR-08, FR-14)
- [ ] `POST /api/v1/excursions/{id}/slots`, `PUT /api/v1/slots/{id}` (reschedule, FR-09, FR-10, FR-12)
- [ ] Wire `ProviderHubPage.tsx` excursion/slot forms to backend endpoints

### Phase P4 — Public Search & Catalog API
- [ ] `GET /api/v1/excursions` with keyword, city, category, date/price/rating filters, sorting, and pagination (FR-18, FR-19, NFR-01)
- [ ] `GET /api/v1/excursions/{id}` returning stops, upcoming open slots, and reviews (FR-20)
- [ ] `GET /api/v1/categories`
- [ ] Wire `ExcursionsSearchPage.tsx` and `ExcursionDetailsPage.tsx` to live API queries

### Phase P5 — Transactional Booking Core, Mock Payment & Confirmation Email
- [ ] Atomic SQL seat reservation (`UPDATE excursion_slots SET booked_seats = booked_seats + $1 WHERE id = $2 AND status = 'open' AND start_at > now() AND booked_seats + $1 <= max_participants`, FR-02, FR-24)
- [ ] On 0 rows affected: return HTTP `409 SOLD_OUT` with alternative open slots of the same excursion (FR-21, UC-15)
- [ ] Internal `PaymentGateway` interface + mock implementation (`fail` token rolls back transaction, FR-27, FR-28)
- [ ] Reference code generator (`TIS-XXXXXX`, FR-26) and `notification_logs` + SMTP Mailpit sender (FR-03)
- [ ] Wire `CheckoutPage.tsx` and `MyBookingsPage.tsx` to `POST /api/v1/bookings` and `GET /api/v1/bookings/me`

### Phase P6 — Cancellation & 24-Hour Refund Engine
- [ ] `POST /api/v1/bookings/{id}/cancel` enforcing `< 24h` (`released_to_provider`, BR-01) vs `>= 24h` (`refunded`, FR-30) and returning seats (`booked_seats -= seats`, FR-31)
- [ ] `POST /api/v1/slots/{id}/cancel` by provider → 100% refund to all active bookings on that slot (FR-11, FR-33)
- [ ] `GET /api/v1/provider/bookings` participant roster for providers (FR-13)

### Phase P7 — Trip Packages API (Agencies Only)
- [ ] `GET /api/v1/trips`, `GET /api/v1/trips/{id}`, `POST/PUT /api/v1/trips`, `POST /api/v1/trips/{id}/cancel` (FR-15..17)
- [ ] Support `trip_package_id` in `POST /api/v1/bookings`

### Phase P8 — Reviews & Ratings API
- [ ] `POST /api/v1/bookings/{id}/review` and `PUT /api/v1/reviews/{id}` (FR-35..37)
- [ ] Transactional update of `avg_rating` and `review_count` on `excursions` / `trip_packages`

### Phase P9 — Admin API & Background Jobs
- [ ] `GET /api/v1/admin/overview`, `GET /api/v1/admin/users`, `POST /api/v1/admin/users/{id}/block` (FR-38, FR-41)
- [ ] `POST /api/v1/admin/agencies/{id}/verify` (FR-39) and `CRUD /api/v1/admin/categories` (FR-40)
- [ ] Periodic completion job (`confirmed` → `completed` after departure/return, payment `released_to_provider`, §9.7)
