-- Section 8: multi-product orders (cart checkout).
-- orders.product_id stays as the first item so existing admin views keep working;
-- order_items is the source of truth for what was bought and what gets delivered.
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  price INT NOT NULL CHECK (price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all order items" ON public.order_items;
CREATE POLICY "Admin can view all order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Backfill: every existing single-product order becomes a one-item order.
INSERT INTO public.order_items (order_id, product_id, price)
SELECT id, product_id, amount FROM public.orders
ON CONFLICT (order_id, product_id) DO NOTHING;
