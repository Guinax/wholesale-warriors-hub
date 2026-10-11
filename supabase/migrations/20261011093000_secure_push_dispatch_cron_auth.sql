-- The cron token stays in Vault, never in source code or cron.job.
do $block$
begin
  if not exists (select 1 from vault.secrets where name = 'maromba_push_cron_secret') then
    perform vault.create_secret(gen_random_uuid()::text || gen_random_uuid()::text, 'maromba_push_cron_secret', 'Private secret for Maromba scheduled push dispatcher');
  end if;
end
$block$;

create or replace function public.verify_push_dispatch_secret(p_secret text)
returns boolean language sql stable security definer set search_path = ''
as $func$
  select coalesce(length(p_secret) >= 60 and exists (
    select 1 from vault.decrypted_secrets
    where name = 'maromba_push_cron_secret'
      and decrypted_secret = p_secret
  ),false)
$func$;

revoke all on function public.verify_push_dispatch_secret(text) from public, anon, authenticated;
grant execute on function public.verify_push_dispatch_secret(text) to service_role;
