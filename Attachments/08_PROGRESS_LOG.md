# 08 — Project Progress Log

## Current State Summary
- **Current Milestone Completed:** Milestone 1 (P0 + P1 + P2: Docker Compose + Full 12-Table PostgreSQL Schema & Seed + Real Go JWT Auth + Complete React/TS/Tailwind UI/UX across all 4 roles).
- **Next Unchecked Phase:** Phase P3 (Profile, Agency & Excursion/Slot CRUD backend endpoints) in [`02_ROADMAP_PHASES.md`](./02_ROADMAP_PHASES.md).
- **Working Credentials:**
  - Admin: `admin` / `admin`
  - Tourist: `tourist@tis.kz` / `Passw0rd!`
  - Guide: `guide@tis.kz` / `Passw0rd!`
  - Agency Manager: `manager@tis.kz` / `Passw0rd!`

---

## Session Log

### Session 1 — 2026-11-03
- **Goal:** Plan the project architecture, create the handoff documentation pack in `Attachments/`, implement the full PostgreSQL database schema & seed (including `admin` / `admin`), build the Go authentication backend (`register`, `login`, `me`, `health`), and build the complete UI/UX for all roles.
- **Completed:**
  1. Created `backend/migrations/000001_init_schema.up.sql` & `000002_seed_categories.up.sql` with all 12 tables, foreign keys, `CHECK` constraints (`slot_capacity_chk`, `trip_capacity_chk`, `booking_target_chk`, `review_target_chk`), and §9.6 indexes.
  2. Implemented the Go backend (`backend/cmd/api`, `internal/config`, `internal/platform/db`, `internal/platform/httpx`, `internal/user`, `internal/auth`, `internal/seed`) with automatic startup migrations, idempotent dev seeding (`admin`/`admin` + sample users/agency/excursions/slots/trips), and unit tests (`go test ./...` passing).
  3. Built the React + TypeScript + Tailwind SPA (`frontend/`) with real JWT login/registration, 3-second timeout handling (`UnavailablePage` for NFR-02), and interactive screens for Public search/details, Tourist checkout (including Sold Out + alternative slots for FR-02/FR-21) & bookings (24-hour refund rule for BR-01), Provider Hub (Excursions, Slots, Participant Roster, Trip Packages, Agency Profile), and Admin Console (Overview, Users, Agencies, Categories, Bookings).
  4. Configured `docker-compose.yml` (`db`, `backend`, `frontend`) and wrote the handoff documentation pack in `Attachments/`.
