ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS expedition_status text NOT NULL DEFAULT 'aguardando';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vehicle_plate text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS loaded_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispatched_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS expedition_notes text;

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_code text,
  qty integer NOT NULL,
  reason text NOT NULL DEFAULT 'carregamento',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view stock movements" ON public.stock_movements
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert stock movements" ON public.stock_movements
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS stock_movements_created_at_idx ON public.stock_movements (created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;