-- Atomic, idempotent inventory allocation after verified payment.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS inventory_allocated_at timestamptz;

CREATE OR REPLACE FUNCTION public.allocate_paid_order_inventory(_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  ord public.orders%ROWTYPE;
  item jsonb;
  pid uuid;
  needed integer;
  bal record;
  take_qty integer;
  remaining integer;
BEGIN
  SELECT * INTO ord FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND OR ord.payment_status <> 'paid' THEN RETURN false; END IF;
  IF ord.inventory_allocated_at IS NOT NULL THEN RETURN true; END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(ord.items::jsonb)
  LOOP
    needed := COALESCE((item->>'qty')::integer, (item->>'quantity')::integer, 0);
    IF needed <= 0 THEN RAISE EXCEPTION 'invalid order quantity'; END IF;

    IF item ? 'product_id' AND NULLIF(item->>'product_id','') IS NOT NULL THEN
      pid := (item->>'product_id')::uuid;
    ELSE
      SELECT id INTO pid FROM public.products WHERE name = item->>'name' AND active = true LIMIT 1;
    END IF;
    IF pid IS NULL THEN RAISE EXCEPTION 'product not found for inventory allocation'; END IF;

    SELECT COALESCE(SUM(quantity-reserved),0)::integer INTO remaining
    FROM public.inventory_balances WHERE product_id=pid;
    IF remaining < needed THEN RAISE EXCEPTION 'insufficient unified inventory for product %', pid; END IF;

    remaining := needed;
    FOR bal IN
      SELECT id, quantity, reserved FROM public.inventory_balances
      WHERE product_id=pid AND quantity>reserved
      ORDER BY (quantity-reserved) DESC, updated_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN remaining=0;
      take_qty := LEAST(remaining, bal.quantity-bal.reserved);
      UPDATE public.inventory_balances
      SET quantity=quantity-take_qty, updated_at=now()
      WHERE id=bal.id;
      remaining := remaining-take_qty;
    END LOOP;
  END LOOP;

  UPDATE public.orders SET inventory_allocated_at=now() WHERE id=_order_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_paid_order_inventory(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_paid_order_inventory(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.orders_allocate_inventory_after_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.payment_status='paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
    PERFORM public.allocate_paid_order_inventory(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_allocate_inventory_after_payment ON public.orders;
CREATE TRIGGER orders_allocate_inventory_after_payment
AFTER UPDATE OF payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_allocate_inventory_after_payment();
