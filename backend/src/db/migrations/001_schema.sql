-- RideShare MVP Database Schema
-- Run: npm run migrate

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (both drivers and passengers)
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number  VARCHAR(20) UNIQUE NOT NULL,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('driver', 'passenger', 'admin')),
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Driver profiles
CREATE TABLE IF NOT EXISTS driver_profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name  VARCHAR(100) NOT NULL,
  photo_url     TEXT,
  car_make_model VARCHAR(100),
  bio           VARCHAR(500),
  allow_calls   BOOLEAN NOT NULL DEFAULT TRUE,
  rating_avg    NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count  INT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Driver availability status
CREATE TABLE IF NOT EXISTS driver_status (
  driver_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status        VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('available', 'busy', 'offline')),
  last_updated  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  passenger_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stars         INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment       VARCHAR(300),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (driver_id, passenger_id, created_at)
);

-- Blocks
CREATE TABLE IF NOT EXISTS blocks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id)
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason          VARCHAR(50) NOT NULL CHECK (reason IN ('spam', 'harassment', 'unsafe', 'other')),
  details         TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_status_status ON driver_status(status);
CREATE INDEX IF NOT EXISTS idx_driver_status_updated ON driver_status(last_updated);
CREATE INDEX IF NOT EXISTS idx_reviews_driver ON reviews(driver_id);
CREATE INDEX IF NOT EXISTS idx_reviews_passenger ON reviews(passenger_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
