alter function public.admin_adjust_central_stock(uuid,integer) security invoker;
alter function public.admin_set_inventory_balance(uuid,uuid,integer) security invoker;

revoke all on function public.reserve_order_inventory(uuid) from public,anon;
grant execute on function public.reserve_order_inventory(uuid) to authenticated;

do $outer$
declare d text;
begin
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='reserve_order_inventory';
 d:=replace(d,
 $old$IF ord.user_id<>auth.uid() AND NOT private.is_admin() THEN RAISE EXCEPTION 'not authorized';END IF;
 IF ord.payment_status<>'pending' THEN RAISE EXCEPTION 'order is not pending';END IF;$old$,
 $new$IF auth.uid() IS NULL OR ord.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'not authorized';END IF;
 IF ord.fulfillment_store_id IS NOT NULL THEN RAISE EXCEPTION 'partner orders use partner inventory';END IF;
 IF ord.payment_status<>'pending' THEN RAISE EXCEPTION 'order is not pending';END IF;$new$);
 execute d;
end $outer$;