-- Keep partner/local orders consistent with the main checkout:
-- do not create a fake carrier tracking code when the order is created.
-- Real tracking remains nullable until dispatch/expedition supplies one.

do $$
declare
  fn text;
  patched text;
begin
  select pg_get_functiondef(p.oid)
    into fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and p.proname = 'partner_command'
    and pg_get_function_identity_arguments(p.oid) = 'p_action text, p_payload jsonb';

  if fn is null then
    raise exception 'private.partner_command(text,jsonb) not found';
  end if;

  patched := replace(
    fn,
    'values(u,code,code,''infinitepay''',
    'values(u,code,null,''infinitepay'''
  );

  if patched = fn then
    raise exception 'legacy partner tracking placeholder pattern not found';
  end if;

  execute patched;
end
$$;
