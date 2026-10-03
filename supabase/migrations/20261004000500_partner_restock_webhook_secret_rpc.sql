create or replace function public.service_get_restock_webhook_secret()
returns text
language sql
security definer
set search_path=''
as $$
  select secret from private.partner_restock_webhook_config where singleton=true;
$$;

revoke all on function public.service_get_restock_webhook_secret() from public, anon, authenticated;
grant execute on function public.service_get_restock_webhook_secret() to service_role;
