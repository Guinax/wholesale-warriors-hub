do $migration$
declare d text;
begin
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='private' and p.proname='partner_command' and pg_get_function_identity_arguments(p.oid)='p_action text, p_payload jsonb';
 d:=replace(d,
 'select r.id,q.id,q.distance,now()+(row_number() over(order by q.distance,q.id)-1)*interval ''30 seconds''
   from (select st.id,private.partner_distance(r.lat,r.lng,st.lat,st.lng)::numeric distance,st.radius_km,case when st.delivery_mode in (''own'',''hybrid'') and st.own_driver_available then 0 else 1 end delivery_priority
    from public.partner_stores st',
 'select r.id,q.id,q.distance,now()+(row_number() over(order by q.delivery_priority,q.distance,q.stock_headroom desc,q.id)-1)*interval ''30 seconds''
   from (select st.id,private.partner_distance(r.lat,r.lng,st.lat,st.lng)::numeric distance,st.radius_km,case when st.delivery_mode in (''own'',''hybrid'') and st.own_driver_available then 0 else 1 end delivery_priority,
    coalesce((select min((inv.on_hand-inv.reserved)::numeric/x.qty) from jsonb_to_recordset(lines) as x(product_id uuid,qty integer) join public.partner_inventory inv on inv.store_id=st.id and inv.product_id=x.product_id),0) stock_headroom
    from public.partner_stores st');
 d:=replace(d,'order by q.delivery_priority,q.distance limit 20;','order by q.delivery_priority,q.distance,q.stock_headroom desc,q.id limit 20;');
 if strpos(d,'q.delivery_priority,q.distance,q.stock_headroom desc,q.id')=0 then raise exception 'balanced routing patch failed'; end if;
 execute d;
end $migration$;