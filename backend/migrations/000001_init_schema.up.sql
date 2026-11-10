-- Tourism IS — initial schema (spec §7, §9.6, §12.5)
-- All timestamps are TIMESTAMPTZ (stored UTC). Money is BIGINT minor units (tiyn).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------- users
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT        NOT NULL,
    password_hash TEXT        NOT NULL,
    full_name     TEXT        NOT NULL,
    phone         TEXT        NOT NULL,
    role          TEXT        NOT NULL CHECK (role IN ('tourist', 'guide', 'agency_manager', 'admin')),
    is_blocked    BOOLEAN     NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email));
CREATE INDEX users_role_idx ON users (role);

-- ---------------------------------------------------------------- agencies
CREATE TABLE agencies (
    id                  BIGSERIAL PRIMARY KEY,
    manager_user_id     BIGINT      NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    name                TEXT        NOT NULL,
    description         TEXT        NOT NULL DEFAULT '',
    city                TEXT        NOT NULL,
    contact_email       TEXT        NOT NULL,
    contact_phone       TEXT        NOT NULL,
    verification_status TEXT        NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- categories
CREATE TABLE categories (
    id        BIGSERIAL PRIMARY KEY,
    name      TEXT    NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------- excursions
CREATE TABLE excursions (
    id               BIGSERIAL PRIMARY KEY,
    owner_user_id    BIGINT        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    agency_id        BIGINT        REFERENCES agencies (id) ON DELETE RESTRICT,
    category_id      BIGINT        NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
    title            TEXT          NOT NULL,
    description      TEXT          NOT NULL DEFAULT '',
    city             TEXT          NOT NULL,
    meeting_point    TEXT          NOT NULL,
    duration_minutes INT           NOT NULL CHECK (duration_minutes > 0),
    base_price_minor BIGINT        NOT NULL CHECK (base_price_minor >= 0),
    status           TEXT          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    avg_rating       NUMERIC(3, 2) NOT NULL DEFAULT 0 CHECK (avg_rating BETWEEN 0 AND 5),
    review_count     INT           NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX excursions_city_cat_status_idx ON excursions (city, category_id, status);
CREATE INDEX excursions_owner_idx ON excursions (owner_user_id);
CREATE INDEX excursions_agency_idx ON excursions (agency_id);
CREATE INDEX excursions_title_trgm_idx ON excursions USING gin (title gin_trgm_ops);

-- ---------------------------------------------------------------- itinerary_stops
CREATE TABLE itinerary_stops (
    id               BIGSERIAL PRIMARY KEY,
    excursion_id     BIGINT NOT NULL REFERENCES excursions (id) ON DELETE CASCADE,
    position         INT    NOT NULL CHECK (position >= 1),
    title            TEXT   NOT NULL,
    description      TEXT   NOT NULL DEFAULT '',
    duration_minutes INT CHECK (duration_minutes IS NULL OR duration_minutes > 0),
    UNIQUE (excursion_id, position)
);

-- ---------------------------------------------------------------- excursion_slots
CREATE TABLE excursion_slots (
    id               BIGSERIAL PRIMARY KEY,
    excursion_id     BIGINT      NOT NULL REFERENCES excursions (id) ON DELETE CASCADE,
    start_at         TIMESTAMPTZ NOT NULL,
    price_minor      BIGINT      NOT NULL CHECK (price_minor >= 0),
    max_participants INT         NOT NULL CHECK (max_participants >= 1),
    booked_seats     INT         NOT NULL DEFAULT 0,
    status           TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'cancelled')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT slot_capacity_chk CHECK (booked_seats >= 0 AND booked_seats <= max_participants)
);
CREATE INDEX excursion_slots_start_idx ON excursion_slots (start_at);
CREATE INDEX excursion_slots_excursion_idx ON excursion_slots (excursion_id, start_at);

-- ---------------------------------------------------------------- trip_packages
CREATE TABLE trip_packages (
    id                     BIGSERIAL PRIMARY KEY,
    agency_id              BIGINT        NOT NULL REFERENCES agencies (id) ON DELETE RESTRICT,
    category_id            BIGINT        NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
    title                  TEXT          NOT NULL,
    description            TEXT          NOT NULL DEFAULT '',
    destination            TEXT          NOT NULL,
    departure_at           TIMESTAMPTZ   NOT NULL,
    return_at              TIMESTAMPTZ   NOT NULL,
    price_per_person_minor BIGINT        NOT NULL CHECK (price_per_person_minor >= 0),
    total_seats            INT           NOT NULL CHECK (total_seats >= 1),
    booked_seats           INT           NOT NULL DEFAULT 0,
    included_services      TEXT          NOT NULL DEFAULT '',
    status                 TEXT          NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'cancelled', 'archived')),
    avg_rating             NUMERIC(3, 2) NOT NULL DEFAULT 0 CHECK (avg_rating BETWEEN 0 AND 5),
    review_count           INT           NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT trip_capacity_chk CHECK (booked_seats >= 0 AND booked_seats <= total_seats),
    CONSTRAINT trip_dates_chk CHECK (return_at >= departure_at)
);
CREATE INDEX trip_packages_departure_status_idx ON trip_packages (departure_at, status);
CREATE INDEX trip_packages_agency_idx ON trip_packages (agency_id);
CREATE INDEX trip_packages_title_trgm_idx ON trip_packages USING gin (title gin_trgm_ops);

-- ---------------------------------------------------------------- trip_days
CREATE TABLE trip_days (
    id              BIGSERIAL PRIMARY KEY,
    trip_package_id BIGINT NOT NULL REFERENCES trip_packages (id) ON DELETE CASCADE,
    day_number      INT    NOT NULL CHECK (day_number >= 1),
    title           TEXT   NOT NULL,
    description     TEXT   NOT NULL DEFAULT '',
    UNIQUE (trip_package_id, day_number)
);

-- ---------------------------------------------------------------- bookings
CREATE TABLE bookings (
    id                 BIGSERIAL PRIMARY KEY,
    reference_code     TEXT        NOT NULL UNIQUE,
    tourist_id         BIGINT      NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    excursion_slot_id  BIGINT      REFERENCES excursion_slots (id) ON DELETE RESTRICT,
    trip_package_id    BIGINT      REFERENCES trip_packages (id) ON DELETE RESTRICT,
    seats              INT         NOT NULL CHECK (seats >= 1),
    total_amount_minor BIGINT      NOT NULL CHECK (total_amount_minor >= 0),
    contact_email      TEXT        NOT NULL,
    contact_phone      TEXT        NOT NULL,
    special_requests   TEXT,
    status             TEXT        NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('confirmed', 'cancelled_by_tourist', 'cancelled_by_provider', 'completed')),
    cancelled_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT booking_target_chk CHECK (num_nonnulls(excursion_slot_id, trip_package_id) = 1)
);
CREATE INDEX bookings_tourist_idx ON bookings (tourist_id);
CREATE INDEX bookings_slot_idx ON bookings (excursion_slot_id);
CREATE INDEX bookings_trip_idx ON bookings (trip_package_id);
CREATE INDEX bookings_status_idx ON bookings (status);

-- ---------------------------------------------------------------- payments
CREATE TABLE payments (
    id                    BIGSERIAL PRIMARY KEY,
    booking_id            BIGINT      NOT NULL UNIQUE REFERENCES bookings (id) ON DELETE CASCADE,
    amount_minor          BIGINT      NOT NULL CHECK (amount_minor >= 0),
    method                TEXT        NOT NULL DEFAULT 'mock' CHECK (method IN ('mock')),
    transaction_ref       TEXT        NOT NULL,
    status                TEXT        NOT NULL DEFAULT 'paid'
        CHECK (status IN ('paid', 'refunded', 'released_to_provider')),
    refunded_amount_minor BIGINT      NOT NULL DEFAULT 0 CHECK (refunded_amount_minor >= 0),
    paid_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT payment_refund_chk CHECK (refunded_amount_minor <= amount_minor)
);

-- ---------------------------------------------------------------- reviews
CREATE TABLE reviews (
    id              BIGSERIAL PRIMARY KEY,
    booking_id      BIGINT      NOT NULL UNIQUE REFERENCES bookings (id) ON DELETE CASCADE,
    tourist_id      BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    excursion_id    BIGINT      REFERENCES excursions (id) ON DELETE CASCADE,
    trip_package_id BIGINT      REFERENCES trip_packages (id) ON DELETE CASCADE,
    rating          SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT review_target_chk CHECK (num_nonnulls(excursion_id, trip_package_id) = 1)
);
CREATE INDEX reviews_excursion_idx ON reviews (excursion_id);
CREATE INDEX reviews_trip_idx ON reviews (trip_package_id);

-- ---------------------------------------------------------------- notification_logs
CREATE TABLE notification_logs (
    id              BIGSERIAL PRIMARY KEY,
    booking_id      BIGINT REFERENCES bookings (id) ON DELETE SET NULL,
    recipient_email TEXT        NOT NULL,
    type            TEXT        NOT NULL CHECK (type IN (
        'booking_confirmed', 'slot_rescheduled', 'booking_cancelled_by_tourist',
        'cancelled_by_provider', 'provider_new_booking')),
    subject         TEXT        NOT NULL DEFAULT '',
    body            TEXT        NOT NULL DEFAULT '',
    status          TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    attempts        INT         NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    last_error      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notification_logs_status_idx ON notification_logs (status);
