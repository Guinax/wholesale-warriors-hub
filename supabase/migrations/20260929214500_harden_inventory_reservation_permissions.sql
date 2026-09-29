-- Harden inventory reservation permissions.
REVOKE ALL ON FUNCTION public.orders_inventory_lifecycle() FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS order_inventory_reservations_admin_read ON public.order_inventory_reservations;
CREATE POLICY order_inventory_reservations_admin_read ON public.order_inventory_reservations FOR SELECT TO authenticated USING (private.is_admin());