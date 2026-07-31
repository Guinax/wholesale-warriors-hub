ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS due_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours');

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE public.orders SET expires_at = due_at + interval '2 hours' WHERE expires_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_order_expires_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  NEW.expires_at := NEW.due_at + interval '2 hours';
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS orders_set_expires_at ON public.orders;
CREATE TRIGGER orders_set_expires_at
BEFORE INSERT OR UPDATE OF due_at ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_expires_at();

CREATE OR REPLACE FUNCTION public.expire_overdue_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.orders
     SET payment_status = 'expired'
   WHERE payment_status = 'pending'
     AND now() > due_at + interval '2 hours';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_overdue_orders() FROM public;
GRANT EXECUTE ON FUNCTION public.expire_overdue_orders() TO service_role;
