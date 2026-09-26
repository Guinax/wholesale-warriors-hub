ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);

DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
DROP POLICY IF EXISTS "Public can read orders by code" ON public.orders;
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can create own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
REVOKE INSERT, SELECT ON public.orders FROM anon;
GRANT INSERT, SELECT ON public.orders TO authenticated;

CREATE OR REPLACE FUNCTION public.get_order_by_code(_order_code text)
RETURNS SETOF public.orders
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT o.* FROM public.orders AS o
  WHERE o.order_code = _order_code
    AND auth.uid() IS NOT NULL
    AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_order_by_code(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_order_by_code(text) TO authenticated;