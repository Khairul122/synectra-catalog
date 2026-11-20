-- Section 7: security & reliability hardening.

-- 1. Orders: persist payment URL (resume payment) and checkout idempotency key.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_url TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON public.orders(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 2. Admin = the store owner, i.e. an auth user that has a profiles row.
--    Replaces "any authenticated user" grants from migration 002.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()));
$$;

DROP POLICY IF EXISTS "Active links are viewable by everyone" ON public.links;
CREATE POLICY "Active links are viewable by everyone"
  ON public.links FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin full access on links" ON public.links;
CREATE POLICY "Admin full access on links"
  ON public.links FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Active products are viewable by everyone" ON public.products;
CREATE POLICY "Active products are viewable by everyone"
  ON public.products FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin full access on products" ON public.products;
CREATE POLICY "Admin full access on products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can view all orders" ON public.orders;
CREATE POLICY "Admin can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Profiles: only an existing owner may insert (blocks self-promotion to admin).
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Storage write policies: admin only.
DROP POLICY IF EXISTS "Admin can upload to public-assets" ON storage.objects;
CREATE POLICY "Admin can upload to public-assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'public-assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admin can update objects in public-assets" ON storage.objects;
CREATE POLICY "Admin can update objects in public-assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'public-assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admin can delete objects in public-assets" ON storage.objects;
CREATE POLICY "Admin can delete objects in public-assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'public-assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admin can upload to private-products" ON storage.objects;
CREATE POLICY "Admin can upload to private-products"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'private-products' AND public.is_admin());

DROP POLICY IF EXISTS "Admin can update objects in private-products" ON storage.objects;
CREATE POLICY "Admin can update objects in private-products"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'private-products' AND public.is_admin());

DROP POLICY IF EXISTS "Admin can delete objects in private-products" ON storage.objects;
CREATE POLICY "Admin can delete objects in private-products"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'private-products' AND public.is_admin());

-- Guarantee the product bucket stays private even if toggled in the dashboard.
UPDATE storage.buckets SET public = false WHERE id = 'private-products';
