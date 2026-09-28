-- The browser may create pending orders, but payment evidence belongs to the provider.
CREATE POLICY orders_payment_insert_guard ON public.orders
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  payment_status = 'pending'
  AND delivery_status = 'aguardando_pagamento'
  AND expedition_status = 'pendente'
  AND payment_provider IS NULL
  AND payment_nsu IS NULL
  AND payment_details IS NULL
  AND payment_checked_at IS NULL
  AND dispatched_at IS NULL
  AND loaded_at IS NULL
  AND delivered_at IS NULL
  AND total_amount > 0
  AND jsonb_typeof(items) = 'array'
  AND jsonb_array_length(items) > 0
);

CREATE OR REPLACE FUNCTION private.guard_order_payment_update()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND (
    NEW.payment_status IS DISTINCT FROM OLD.payment_status OR
    NEW.payment_nsu IS DISTINCT FROM OLD.payment_nsu OR
    NEW.payment_provider IS DISTINCT FROM OLD.payment_provider OR
    NEW.payment_details IS DISTINCT FROM OLD.payment_details OR
    NEW.payment_checked_at IS DISTINCT FROM OLD.payment_checked_at OR
    NEW.total_amount IS DISTINCT FROM OLD.total_amount OR
    NEW.items IS DISTINCT FROM OLD.items OR
    NEW.user_id IS DISTINCT FROM OLD.user_id
  ) THEN
    RAISE EXCEPTION 'Payment fields can only be changed by the payment service' USING ERRCODE = '42501';
  END IF;
  IF current_user IN ('authenticated', 'anon') AND NEW.payment_status <> 'paid' AND (
    NEW.delivery_status IS DISTINCT FROM OLD.delivery_status OR
    NEW.expedition_status IS DISTINCT FROM OLD.expedition_status OR
    NEW.dispatched_at IS DISTINCT FROM OLD.dispatched_at OR
    NEW.loaded_at IS DISTINCT FROM OLD.loaded_at OR
    NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
  ) THEN
    RAISE EXCEPTION 'Payment must be confirmed before dispatch' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_order_payment_update() FROM PUBLIC;
CREATE TRIGGER guard_order_payment_update BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.guard_order_payment_update();
