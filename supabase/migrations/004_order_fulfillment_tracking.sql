-- Section 6: payment and fulfillment retry state.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_state VARCHAR(16) NOT NULL DEFAULT 'PENDING'
    CHECK (fulfillment_state IN ('PENDING', 'PROCESSING', 'SENT')),
  ADD COLUMN IF NOT EXISTS payment_error TEXT,
  ADD COLUMN IF NOT EXISTS fulfillment_error TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_state
  ON public.orders(fulfillment_state);
