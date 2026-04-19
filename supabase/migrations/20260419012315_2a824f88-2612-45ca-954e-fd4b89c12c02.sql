
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code text NOT NULL UNIQUE,
  tracking_code text NOT NULL UNIQUE,
  payment_method text NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  delivery_status text NOT NULL DEFAULT 'postado',
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  customer_cnpj text,
  address_street text NOT NULL,
  address_number text NOT NULL,
  address_complement text,
  address_city text NOT NULL,
  address_state text NOT NULL,
  address_zip text NOT NULL,
  items jsonb NOT NULL,
  total_amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can create orders"
ON public.orders FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public can read orders by code"
ON public.orders FOR SELECT
TO public
USING (true);

CREATE INDEX idx_orders_tracking ON public.orders(tracking_code);
CREATE INDEX idx_orders_code ON public.orders(order_code);
