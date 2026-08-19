ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_nsu text,
  ADD COLUMN IF NOT EXISTS payment_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_details jsonb;

CREATE INDEX IF NOT EXISTS orders_payment_nsu_idx ON public.orders (payment_nsu);