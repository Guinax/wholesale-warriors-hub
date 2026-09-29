CREATE OR REPLACE FUNCTION public.orders_inventory_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
    BEGIN
      PERFORM public.allocate_paid_order_inventory(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'inventory allocation failed for paid order %: %', NEW.id, SQLERRM;
    END;
  ELSIF NEW.payment_status IN ('expired','cancelled','canceled')
    AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    PERFORM public.release_order_inventory(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.orders_inventory_lifecycle() FROM PUBLIC, anon, authenticated;
