-- Each new checkout creates a separate request, even when the customer has active orders.
-- Keep the existing 10 requests/hour limit and all per-order inventory/payment checks.
DO $$
DECLARE definition text; old_rule text;
BEGIN
  definition := pg_get_functiondef('private.partner_command(text,jsonb)'::regprocedure);
  old_rule := '  if exists(select 1 from public.partner_requests where customer_id=u and status in (''searching'',''accepted'',''quoted'',''payment_pending'')) then raise exception ''Você já tem uma solicitação em andamento. Acompanhe ou cancele antes de iniciar outra.''; end if;' || chr(10);
  IF position(old_rule in definition)>0 THEN
    EXECUTE replace(definition,old_rule,'');
  END IF;
END $$;
