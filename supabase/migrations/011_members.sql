-- Buyer accounts for the member area. Rows are keyed by the Supabase auth user (email OTP login).
-- Orders stay linked by buyer_email, so purchases made before signing up show up automatically.
CREATE TABLE IF NOT EXISTS members (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  address TEXT,
  province TEXT,
  city TEXT,
  district TEXT,
  area TEXT,
  zip_code TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No policies: only the backend (service role) reads and writes members.
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
