-- Section 11: the store runs exactly one payment method at a time, chosen by the admin.
-- Buyers no longer pick; checkout uses whatever is active here.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(16) NOT NULL DEFAULT 'DOKU'
  CHECK (payment_mode IN ('DOKU', 'QRIS_MANUAL'));
