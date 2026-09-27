CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role = 'admin'::public.app_role
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;

REVOKE ALL ON TABLE public.orders FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO authenticated;

DROP POLICY IF EXISTS orders_admin_select ON public.orders;
DROP POLICY IF EXISTS orders_admin_update ON public.orders;
CREATE POLICY orders_admin_select
ON public.orders FOR SELECT TO authenticated
USING (private.is_admin());
CREATE POLICY orders_admin_update
ON public.orders FOR UPDATE TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS profiles_admin_select ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
CREATE POLICY profiles_admin_select
ON public.profiles FOR SELECT TO authenticated
USING (private.is_admin());
CREATE POLICY profiles_admin_update
ON public.profiles FOR UPDATE TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

REVOKE ALL ON TABLE public.products FROM anon, authenticated;
GRANT SELECT ON TABLE public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO authenticated;

DROP POLICY IF EXISTS products_admin_select ON public.products;
DROP POLICY IF EXISTS products_admin_insert ON public.products;
DROP POLICY IF EXISTS products_admin_update ON public.products;
DROP POLICY IF EXISTS products_admin_delete ON public.products;
CREATE POLICY products_admin_select
ON public.products FOR SELECT TO authenticated
USING (private.is_admin());
CREATE POLICY products_admin_insert
ON public.products FOR INSERT TO authenticated
WITH CHECK (private.is_admin());
CREATE POLICY products_admin_update
ON public.products FOR UPDATE TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());
CREATE POLICY products_admin_delete
ON public.products FOR DELETE TO authenticated
USING (private.is_admin());

REVOKE ALL ON TABLE public.videos FROM anon, authenticated;
GRANT SELECT ON TABLE public.videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.videos TO authenticated;

DROP POLICY IF EXISTS videos_admin_select ON public.videos;
DROP POLICY IF EXISTS videos_admin_insert ON public.videos;
DROP POLICY IF EXISTS videos_admin_update ON public.videos;
DROP POLICY IF EXISTS videos_admin_delete ON public.videos;
CREATE POLICY videos_admin_select
ON public.videos FOR SELECT TO authenticated
USING (private.is_admin());
CREATE POLICY videos_admin_insert
ON public.videos FOR INSERT TO authenticated
WITH CHECK (private.is_admin());
CREATE POLICY videos_admin_update
ON public.videos FOR UPDATE TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());
CREATE POLICY videos_admin_delete
ON public.videos FOR DELETE TO authenticated
USING (private.is_admin());

REVOKE ALL ON TABLE public.audit_logs FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.audit_logs TO authenticated;

DROP POLICY IF EXISTS audit_admin_select ON public.audit_logs;
CREATE POLICY audit_admin_select
ON public.audit_logs FOR SELECT TO authenticated
USING (private.is_admin());

REVOKE ALL ON TABLE public.stock_movements FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.stock_movements TO authenticated;

DROP POLICY IF EXISTS stock_admin_select ON public.stock_movements;
DROP POLICY IF EXISTS stock_admin_insert ON public.stock_movements;
CREATE POLICY stock_admin_select
ON public.stock_movements FOR SELECT TO authenticated
USING (private.is_admin());
CREATE POLICY stock_admin_insert
ON public.stock_movements FOR INSERT TO authenticated
WITH CHECK (private.is_admin());

REVOKE ALL ON TABLE public.user_roles FROM anon, authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;

CREATE OR REPLACE FUNCTION public.get_order_by_code(_order_code text)
RETURNS SETOF public.orders
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT o.*
  FROM public.orders AS o
  WHERE o.order_code = _order_code
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_order_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_order_by_code(text) TO authenticated;
