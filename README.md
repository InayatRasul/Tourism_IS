# Tourism IS — Plan Trips and Plan Excursions

**Course Project (KBTU)** · **Stack:** Go (`chi` + `pgx` + `golang-migrate` + `JWT`) · React + TypeScript + Tailwind CSS · PostgreSQL 17 · Docker Compose

---

## Quick Start

Start the entire system (PostgreSQL 17 + Go API + React UI via Nginx) with a single command:

```bash
docker compose up -d --build
```

- **Frontend UI:** [http://localhost:3000](http://localhost:3000)
- **Backend REST API:** [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health)
- **PostgreSQL Database:** `localhost:5432` (database `tis`, user `tis`, password `tis`)

---

## Seeded Database Logins (Development Mode)

On first startup (`APP_ENV=dev`), the Go backend automatically applies embedded database migrations (`backend/migrations/`) and seeds these accounts into PostgreSQL:

| Role | Login / Email | Password | Capabilities |
|------|---------------|----------|--------------|
| **Admin** | `admin` | `admin` | Platform overview, block/unblock users, verify/reject agencies, manage categories, view all bookings |
| **Tourist** | `tourist@tis.kz` | `Passw0rd!` | Search & filter excursions/trips, book slots (with Sold Out + alternatives test), cancel with 24h refund rule, leave reviews |
| **Guide** | `guide@tis.kz` | `Passw0rd!` | Create/publish excursions & itinerary stops, add/reschedule/cancel time slots, view participant rosters |
| **Agency Manager** | `manager@tis.kz` | `Passw0rd!` | Manage agency profile (`Steppe Explorers`), publish excursions, create & manage multi-day Trip Packages |

---

## Project Structure

```text
BIS/
├── backend/                         # Go REST API + Embedded SQL Migrations
│   ├── cmd/api/main.go
│   ├── internal/
│   │   ├── auth/                    # Register, Login, Me, JWT & Role middleware
│   │   ├── config/
│   │   ├── platform/db/             # pgxpool (2s timeout) & golang-migrate
│   │   ├── platform/httpx/          # Error JSON, 503 Service Unavailable mapping
│   │   ├── seed/                    # Dev seed (admin/admin, guide, manager, tourist, offers)
│   │   └── user/
│   └── migrations/                  # Full 12-table PostgreSQL schema + constraints + indexes
├── frontend/                        # React + TypeScript + Tailwind SPA
│   ├── src/
│   │   ├── api/                     # Fetch wrapper (3s timeout -> 503 page) & auth API
│   │   ├── auth/                    # AuthContext & role guards
│   │   ├── components/              # Role-aware Navbar & Layout
│   │   ├── mocks/                   # Interactive store for all domain flows
│   │   └── pages/                   # Public, Tourist, Provider, and Admin screens
│   └── nginx.conf
├── docker-compose.yml
└── Makefile
```
