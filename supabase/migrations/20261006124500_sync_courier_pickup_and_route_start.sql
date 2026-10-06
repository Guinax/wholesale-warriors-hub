DO $$
DECLARE
  f text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
    INTO f
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='private' AND p.proname='courier_command';

  f := replace(
    f,
    '    update public.courier_jobs set status=''picked_up'',picked_up_at=now(),updated_at=now() where id=j.id;
    update public.partner_requests set status=''delivering'' where id=r.id;
    update public.orders set delivery_status=''saiu_entrega'',dispatched_at=coalesce(dispatched_at,now()) where id=r.order_id;
    return jsonb_build_object(''ok'',true);',
    '    update public.courier_jobs set status=''picked_up'',picked_up_at=now(),updated_at=now() where id=j.id;
    return jsonb_build_object(''ok'',true);'
  );

  f := replace(
    f,
    '    update public.courier_jobs set status=''delivering'',updated_at=now() where id=j.id;
    return jsonb_build_object(''ok'',true);',
    '    update public.courier_jobs set status=''delivering'',updated_at=now() where id=j.id;
    update public.partner_requests set status=''delivering'' where id=j.request_id;
    update public.orders
       set delivery_status=''saiu_entrega'',dispatched_at=coalesce(dispatched_at,now())
     where id=(select order_id from public.partner_requests where id=j.request_id);
    return jsonb_build_object(''ok'',true);'
  );

  EXECUTE f;
END
$$;