DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS orders_admin_select ON public.orders;
DROP POLICY IF EXISTS orders_select_owner_or_admin ON public.orders;
CREATE POLICY orders_select_owner_or_admin
ON public.orders FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.is_admin()
);

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_select ON public.profiles;
DROP POLICY IF EXISTS profiles_select_owner_or_admin ON public.profiles;
CREATE POLICY profiles_select_owner_or_admin
ON public.profiles FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.is_admin()
);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
DROP POLICY IF EXISTS profiles_update_owner_or_admin ON public.profiles;
CREATE POLICY profiles_update_owner_or_admin
ON public.profiles FOR UPDATE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.is_admin()
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR private.is_admin()
);

DROP POLICY IF EXISTS products_public_read ON public.products;
DROP POLICY IF EXISTS products_admin_select ON public.products;
DROP POLICY IF EXISTS products_anon_read_active ON public.products;
DROP POLICY IF EXISTS products_authenticated_read ON public.products;
CREATE POLICY products_anon_read_active
ON public.products FOR SELECT TO anon
USING (active = true);
CREATE POLICY products_authenticated_read
ON public.products FOR SELECT TO authenticated
USING (
  active = true
  OR private.is_admin()
);

DROP POLICY IF EXISTS videos_public_read ON public.videos;
DROP POLICY IF EXISTS videos_admin_select ON public.videos;
DROP POLICY IF EXISTS videos_anon_read_active ON public.videos;
DROP POLICY IF EXISTS videos_authenticated_read ON public.videos;
CREATE POLICY videos_anon_read_active
ON public.videos FOR SELECT TO anon
USING (active = true);
CREATE POLICY videos_authenticated_read
ON public.videos FOR SELECT TO authenticated
USING (
  active = true
  OR private.is_admin()
);

DROP POLICY IF EXISTS audit_read_own ON public.audit_logs;
DROP POLICY IF EXISTS audit_admin_select ON public.audit_logs;
DROP POLICY IF EXISTS audit_select_owner_or_admin ON public.audit_logs;
CREATE POLICY audit_select_owner_or_admin
ON public.audit_logs FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.is_admin()
);

DROP POLICY IF EXISTS stock_authenticated_read ON public.stock_movements;
DROP POLICY IF EXISTS stock_admin_select ON public.stock_movements;
DROP POLICY IF EXISTS stock_select_owner_or_admin ON public.stock_movements;
CREATE POLICY stock_select_owner_or_admin
ON public.stock_movements FOR SELECT TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR private.is_admin()
);

CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx
ON public.audit_logs (user_id);

CREATE INDEX IF NOT EXISTS stock_movements_created_by_idx
ON public.stock_movements (created_by);
