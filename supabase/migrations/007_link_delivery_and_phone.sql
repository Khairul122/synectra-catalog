-- Section 9: products are delivered as a link (Google Drive etc.) instead of an uploaded file,
-- and buyers leave a phone number at checkout.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS delivery_url TEXT;
-- Old products keep their uploaded file as a fallback; new products only need delivery_url.
ALTER TABLE public.products ALTER COLUMN file_path DROP NOT NULL;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_phone VARCHAR(20);

-- delivery_url IS the product: the anon key (shipped to every browser) must never read it.
-- RLS filters rows, not columns, so expose only the storefront columns to anon/authenticated.
-- The backend uses the service role and is unaffected.
REVOKE SELECT ON public.products FROM anon, authenticated;
GRANT SELECT (id, title, description, price, thumbnail_url, category, is_active, created_at, updated_at)
  ON public.products TO anon, authenticated;
