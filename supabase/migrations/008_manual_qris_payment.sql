-- Section 10: manual QRIS payment. The buyer scans the store's own QR image, confirms on the
-- admin's WhatsApp, and the admin marks the order paid in the panel.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS qris_image_url TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(16) NOT NULL DEFAULT 'DOKU'
  CHECK (payment_method IN ('DOKU', 'QRIS_MANUAL'));
