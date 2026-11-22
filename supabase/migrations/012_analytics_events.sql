-- First-party traffic log for the admin Traffic page: page views and clicks with country and IP.
-- Vercel Web Analytics never exposes IPs, so this table is the only place they live.
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('pageview', 'click')),
  path TEXT NOT NULL,
  label TEXT,
  target TEXT,
  referrer TEXT,
  ip TEXT,
  country TEXT,
  city TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events (created_at DESC);

-- No policies: only the backend (service role) writes and reads; IPs are personal data.
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
