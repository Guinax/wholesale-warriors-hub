do $migration$
declare d text;
begin
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='private' and p.proname='partner_command' and pg_get_function_identity_arguments(p.oid)='p_action text, p_payload jsonb';
 d:=replace(d,'from (select st.id,private.partner_distance(r.lat,r.lng,st.lat,st.lng)::numeric distance,st.radius_km','from (select st.id,private.partner_distance(r.lat,r.lng,st.lat,st.lng)::numeric distance,st.radius_km,case when st.delivery_mode in (''own'',''hybrid'') and st.own_driver_available then 0 else 1 end delivery_priority');
 d:=replace(d,') q where q.distance<=least(50,q.radius_km) order by q.distance limit 20;',') q where q.distance<=least(50,q.radius_km) order by q.delivery_priority,q.distance limit 20;');
 if strpos(d,'order by q.delivery_priority,q.distance limit 20')=0 then raise exception 'routing patch failed'; end if;
 execute d;
end
$migration$;