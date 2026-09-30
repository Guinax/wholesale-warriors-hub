do $migration$
declare
  d text;
  a integer;
  b integer;
  replacement text := $block$insert into public.partner_stores(owner_id,name,document,phone,address,zip,city,state,lat,lng,radius_km)
  values(u,trim(p_payload->>'name'),regexp_replace(p_payload->>'document','\D','','g'),p_payload->>'phone',p_payload->>'address',regexp_replace(p_payload->>'cep','\D','','g'),trim(p_payload->>'city'),upper(trim(p_payload->>'state')),(p_payload->>'lat')::float8,(p_payload->>'lng')::float8,(p_payload->>'radius_km')::numeric)
$block$;
begin
  select pg_get_functiondef(p.oid) into d
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='partner_command'
    and pg_get_function_identity_arguments(p.oid)='p_action text, p_payload jsonb';

  a := strpos(d,'insert into public.partner_stores(');
  b := strpos(d,'  returning id into sid;');
  if a=0 or b=0 or b<=a then raise exception 'partner_command register block not found'; end if;

  d := overlay(d placing replacement from a for b-a);
  execute d;
end
$migration$;
