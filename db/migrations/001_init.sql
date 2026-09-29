-- ============================================================
-- CHEBBA AUTO CAR — initial schema
-- Every primary key is SERIAL. Money is numeric(12,3): the
-- Tunisian dinar has three decimals.
-- ============================================================

-- ---------- users ----------
CREATE TABLE users (
  id            serial PRIMARY KEY,
  role          varchar(10)  NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  full_name     varchar(80)  NOT NULL,
  email         varchar(160) NOT NULL,
  phone         varchar(24)  NOT NULL,
  password_hash varchar(200) NOT NULL,
  is_active     boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
-- login lookup, case-insensitive, and the uniqueness guarantee
CREATE UNIQUE INDEX users_email_key ON users (lower(email));
-- admin client list: newest first, keyset-paginated on id
CREATE INDEX users_role_id_idx ON users (role, id DESC);
-- admin search by phone
CREATE INDEX users_phone_idx ON users (phone);

-- ---------- sessions ----------
CREATE TABLE sessions (
  id         serial PRIMARY KEY,
  user_id    integer     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash char(64)    NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- hit on every authenticated request
CREATE UNIQUE INDEX sessions_token_key ON sessions (token_hash);
CREATE INDEX sessions_user_idx ON sessions (user_id);
-- purge of expired rows
CREATE INDEX sessions_expires_idx ON sessions (expires_at);

-- ---------- cars ----------
CREATE TABLE cars (
  id            serial PRIMARY KEY,
  slug          varchar(80)   NOT NULL UNIQUE,
  make          varchar(40)   NOT NULL,
  model         varchar(40)   NOT NULL,
  trim_level    varchar(40)   NOT NULL DEFAULT '',
  model_year    smallint      NOT NULL,
  seats         smallint      NOT NULL DEFAULT 5 CHECK (seats BETWEEN 1 AND 60),
  luggage       smallint      NOT NULL DEFAULT 2 CHECK (luggage BETWEEN 0 AND 60),
  transmission  varchar(12)   NOT NULL DEFAULT 'automatic' CHECK (transmission IN ('automatic', 'manual')),
  fuel          varchar(12)   NOT NULL DEFAULT 'petrol' CHECK (fuel IN ('petrol', 'diesel', 'hybrid', 'electric')),
  image         varchar(80)   NOT NULL DEFAULT '',
  units         smallint      NOT NULL DEFAULT 1 CHECK (units >= 0),
  for_rental    boolean       NOT NULL DEFAULT true,
  for_transfer  boolean       NOT NULL DEFAULT true,
  price_per_day numeric(12,3) NOT NULL DEFAULT 0 CHECK (price_per_day >= 0),
  -- NULL = use the global per-km rate from settings
  price_per_km  numeric(12,3) CHECK (price_per_km >= 0),
  is_active     boolean       NOT NULL DEFAULT true,
  sort_order    integer       NOT NULL DEFAULT 0,
  created_at    timestamptz   NOT NULL DEFAULT now()
);
-- public catalogue only ever reads active cars, in display order
CREATE INDEX cars_active_idx ON cars (sort_order, id) WHERE is_active;

-- ---------- settings (single row, id = 1) ----------
CREATE TABLE settings (
  id                      serial PRIMARY KEY,
  currency                varchar(6)    NOT NULL DEFAULT 'DT',
  price_per_km            numeric(12,3) NOT NULL DEFAULT 0 CHECK (price_per_km >= 0),
  transfer_base_fee       numeric(12,3) NOT NULL DEFAULT 0 CHECK (transfer_base_fee >= 0),
  transfer_min_price      numeric(12,3) NOT NULL DEFAULT 0 CHECK (transfer_min_price >= 0),
  round_trip_discount_pct numeric(5,2)  NOT NULL DEFAULT 0 CHECK (round_trip_discount_pct BETWEEN 0 AND 100),
  night_surcharge_pct     numeric(5,2)  NOT NULL DEFAULT 0 CHECK (night_surcharge_pct BETWEEN 0 AND 500),
  night_start_hour        smallint      NOT NULL DEFAULT 22 CHECK (night_start_hour BETWEEN 0 AND 23),
  night_end_hour          smallint      NOT NULL DEFAULT 6 CHECK (night_end_hour BETWEEN 0 AND 23),
  max_transfer_km         integer       NOT NULL DEFAULT 1000 CHECK (max_transfer_km > 0),
  min_lead_hours          smallint      NOT NULL DEFAULT 2 CHECK (min_lead_hours >= 0),
  contact_phone           varchar(24)   NOT NULL DEFAULT '',
  contact_whatsapp        varchar(24)   NOT NULL DEFAULT '',
  contact_email           varchar(160)  NOT NULL DEFAULT '',
  updated_at              timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT settings_single_row CHECK (id = 1)
);

-- ---------- places (quick picks in the booking flow) ----------
CREATE TABLE places (
  id         serial PRIMARY KEY,
  name       varchar(80)      NOT NULL,
  kind       varchar(12)      NOT NULL DEFAULT 'city' CHECK (kind IN ('airport', 'agency', 'city', 'hotel', 'port')),
  lat        double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng        double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  is_active  boolean          NOT NULL DEFAULT true,
  sort_order integer          NOT NULL DEFAULT 0
);
CREATE INDEX places_active_idx ON places (sort_order, id) WHERE is_active;

-- ---------- reservations ----------
CREATE TABLE reservations (
  id             serial PRIMARY KEY,
  reference      varchar(16)   NOT NULL,
  user_id        integer       NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  car_id         integer       NOT NULL REFERENCES cars (id) ON DELETE RESTRICT,
  kind           varchar(10)   NOT NULL CHECK (kind IN ('rental', 'transfer')),
  status         varchar(12)   NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'confirmed', 'ongoing', 'completed', 'cancelled')),
  start_at       timestamptz   NOT NULL,
  end_at         timestamptz   NOT NULL,
  pickup_label   varchar(200)  NOT NULL,
  pickup_lat     double precision,
  pickup_lng     double precision,
  dropoff_label  varchar(200)  NOT NULL DEFAULT '',
  dropoff_lat    double precision,
  dropoff_lng    double precision,
  distance_km    numeric(8,2)  NOT NULL DEFAULT 0,
  duration_min   integer       NOT NULL DEFAULT 0,
  route_polyline text          NOT NULL DEFAULT '',
  round_trip     boolean       NOT NULL DEFAULT false,
  passengers     smallint      NOT NULL DEFAULT 1 CHECK (passengers BETWEEN 1 AND 60),
  -- the rate applied at booking time, frozen so later tariff changes never rewrite history
  unit_price     numeric(12,3) NOT NULL,
  quantity       numeric(10,2) NOT NULL,
  fees           numeric(12,3) NOT NULL DEFAULT 0,
  total_price    numeric(12,3) NOT NULL CHECK (total_price >= 0),
  currency       varchar(6)    NOT NULL,
  customer_name  varchar(80)   NOT NULL,
  customer_phone varchar(24)   NOT NULL,
  note           varchar(500)  NOT NULL DEFAULT '',
  admin_note     varchar(500)  NOT NULL DEFAULT '',
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT reservations_period CHECK (end_at > start_at)
);
CREATE UNIQUE INDEX reservations_reference_key ON reservations (reference);
-- "my reservations", newest first
CREATE INDEX reservations_user_idx ON reservations (user_id, id DESC);
-- admin list filtered by status, keyset-paginated on id
CREATE INDEX reservations_status_idx ON reservations (status, id DESC);
-- admin list filtered by kind
CREATE INDEX reservations_kind_idx ON reservations (kind, id DESC);
-- availability check + agenda: only rows that still hold a car
CREATE INDEX reservations_car_period_idx ON reservations (car_id, start_at, end_at)
  WHERE status IN ('pending', 'confirmed', 'ongoing');
-- upcoming departures on the dashboard
CREATE INDEX reservations_upcoming_idx ON reservations (start_at)
  WHERE status IN ('pending', 'confirmed');
-- dashboard: activity and revenue over a date range
CREATE INDEX reservations_created_idx ON reservations (created_at);

-- ---------- reservation_events (status history / audit trail) ----------
CREATE TABLE reservation_events (
  id             serial PRIMARY KEY,
  reservation_id integer     NOT NULL REFERENCES reservations (id) ON DELETE CASCADE,
  actor_id       integer     REFERENCES users (id) ON DELETE SET NULL,
  from_status    varchar(12),
  to_status      varchar(12) NOT NULL,
  note           varchar(500) NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reservation_events_reservation_idx ON reservation_events (reservation_id, id);

-- ---------- login_attempts (brute-force throttle) ----------
CREATE TABLE login_attempts (
  id         serial PRIMARY KEY,
  bucket     varchar(200) NOT NULL,
  created_at timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_bucket_idx ON login_attempts (bucket, created_at);
