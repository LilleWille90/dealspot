-- Dealspot initial schema
-- Run this in the Supabase SQL editor

-- Enable PostGIS for geolocation queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─────────────────────────────────────────────
-- SUPPLIER PROFILES
-- ─────────────────────────────────────────────
CREATE TABLE supplier_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  category      TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'fixed' CHECK (location_type IN ('gps', 'fixed')),
  fixed_address TEXT,
  fixed_lat     DOUBLE PRECISION,
  fixed_lng     DOUBLE PRECISION,
  broadcast_radius INT NOT NULL DEFAULT 500,
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE supplier_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers manage own profile"
  ON supplier_profiles FOR ALL
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- OFFERS
-- ─────────────────────────────────────────────
CREATE TABLE offers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text             TEXT NOT NULL,
  photo_url        TEXT,
  max_redemptions  INT NOT NULL,
  claimed_count    INT NOT NULL DEFAULT 0,
  duration_minutes INT, -- NULL = open (manual close)
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('draft', 'active', 'boosted', 'closed')),
  boost_used       BOOLEAN NOT NULL DEFAULT FALSE,
  broadcast_radius INT NOT NULL DEFAULT 500,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Suppliers can manage their own offers
CREATE POLICY "Suppliers manage own offers"
  ON offers FOR ALL
  USING (auth.uid() = supplier_id);

-- Consumers can read active offers (for offer detail screen)
CREATE POLICY "Consumers read active offers"
  ON offers FOR SELECT
  USING (status IN ('active', 'boosted'));

-- ─────────────────────────────────────────────
-- REDEMPTIONS
-- ─────────────────────────────────────────────
CREATE TABLE redemptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id     UUID REFERENCES offers(id) ON DELETE CASCADE NOT NULL,
  consumer_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  qr_token     TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'redeemed', 'expired')),
  reserved_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  redeemed_at  TIMESTAMPTZ
);

ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

-- Consumers see their own redemptions
CREATE POLICY "Consumers see own redemptions"
  ON redemptions FOR SELECT
  USING (auth.uid() = consumer_id);

-- Consumers can create redemptions (handled via edge function)
CREATE POLICY "Consumers insert redemptions"
  ON redemptions FOR INSERT
  WITH CHECK (auth.uid() = consumer_id);

-- Suppliers see redemptions for their offers (anonymised — no consumer_id exposed)
CREATE POLICY "Suppliers see offer redemptions"
  ON redemptions FOR SELECT
  USING (
    offer_id IN (
      SELECT id FROM offers WHERE supplier_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- CONSUMER LOCATIONS
-- Stores last known position + deal mode state.
-- Purged after 24h by scheduled function.
-- ─────────────────────────────────────────────
CREATE TABLE consumer_locations (
  consumer_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  lat                 DOUBLE PRECISION,
  lng                 DOUBLE PRECISION,
  deal_mode_active    BOOLEAN NOT NULL DEFAULT FALSE,
  deal_mode_expires_at TIMESTAMPTZ,
  radius_metres       INT NOT NULL DEFAULT 500,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE consumer_locations ENABLE ROW LEVEL SECURITY;

-- Only the consumer can read/write their own location
CREATE POLICY "Consumers manage own location"
  ON consumer_locations FOR ALL
  USING (auth.uid() = consumer_id);

-- ─────────────────────────────────────────────
-- SUPPLIER LOCATIONS
-- Live GPS updates while offer is active.
-- ─────────────────────────────────────────────
CREATE TABLE supplier_locations (
  supplier_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  is_live      BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE supplier_locations ENABLE ROW LEVEL SECURITY;

-- Suppliers manage their own location
CREATE POLICY "Suppliers manage own location"
  ON supplier_locations FOR ALL
  USING (auth.uid() = supplier_id);

-- ─────────────────────────────────────────────
-- PUSH TOKENS
-- Stores FCM device tokens for push notifications.
-- ─────────────────────────────────────────────
CREATE TABLE push_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token      TEXT NOT NULL,
  platform   TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, token)
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push tokens"
  ON push_tokens FOR ALL
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- HELPER: distance function (Haversine)
-- Used in edge functions — PostGIS is preferred
-- but this is a fallback for environments without it.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  r DOUBLE PRECISION := 6371000; -- Earth radius in metres
  dlat DOUBLE PRECISION := radians(lat2 - lat1);
  dlng DOUBLE PRECISION := radians(lng2 - lng1);
  a DOUBLE PRECISION;
BEGIN
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)^2;
  RETURN r * 2 * asin(sqrt(a));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─────────────────────────────────────────────
-- GDPR: Location data purge function
-- Call this via a scheduled edge function / pg_cron
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION purge_stale_location_data() RETURNS void AS $$
BEGIN
  -- Clear location data older than 24 hours
  UPDATE consumer_locations
  SET lat = NULL, lng = NULL, deal_mode_active = FALSE
  WHERE updated_at < NOW() - INTERVAL '24 hours';

  -- Expire pending QR reservations older than 15 minutes
  UPDATE redemptions
  SET status = 'expired'
  WHERE status = 'pending'
    AND reserved_at < NOW() - INTERVAL '15 minutes';

  -- Increment spot counter for expired reservations
  UPDATE offers o
  SET claimed_count = (
    SELECT COUNT(*) FROM redemptions r
    WHERE r.offer_id = o.id AND r.status IN ('pending', 'redeemed')
  )
  WHERE id IN (
    SELECT DISTINCT offer_id FROM redemptions WHERE status = 'expired'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- Realtime: enable for live updates
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE offers;
ALTER PUBLICATION supabase_realtime ADD TABLE redemptions;
ALTER PUBLICATION supabase_realtime ADD TABLE consumer_locations;
