-- Local retail tariff: BRL 7.50 for the first 3 km, plus BRL 1.50/km beyond.
-- The existing authenticated partner quote action supplies route_km; validate that route
-- distance against the actual street route before requesting a quote.
do $migration$
declare
  d text;
  old_expr text := 'round(s.delivery_base+s.delivery_per_km*km+s.delivery_per_kg*kg,2)';
  new_expr text := 'round(7.50 + 1.50 * greatest(km - 3, 0), 2)';
begin
  select pg_get_functiondef(p.oid) into d
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='partner_command'
    and pg_get_function_identity_arguments(p.oid)='p_action text, p_payload jsonb';
  if d is null then raise exception 'partner_command was not found'; end if;
  if strpos(d, old_expr) = 0 then raise exception 'Expected partner quote expression not found; review function before migration'; end if;
  d := replace(d, old_expr, new_expr);
  execute d;
end
$migration$;
