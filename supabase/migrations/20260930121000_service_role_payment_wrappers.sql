-- Expose only service-role-safe wrappers through the default Data API schema.
-- The underlying privileged logic remains in private and is not callable by users.
create or replace function public.service_expire_stale_orders()
returns integer
language sql
security invoker
set search_path=''
as $$ select private.expire_stale_orders(); $$;

create or replace function public.service_expire_stale_partner_requests()
returns integer
language sql
security invoker
set search_path=''
as $$ select private.expire_stale_partner_requests(); $$;

create or replace function public.service_partner_checkout_valid(p_order_id uuid)
returns boolean
language sql
stable
security invoker
set search_path=''
as $$ select private.partner_checkout_valid(p_order_id); $$;

create or replace function public.service_partner_mark_order_paid(p_order_id uuid)
returns void
language sql
security invoker
set search_path=''
as $$ select private.partner_mark_order_paid(p_order_id); $$;

revoke all on function public.service_expire_stale_orders() from public,anon,authenticated;
revoke all on function public.service_expire_stale_partner_requests() from public,anon,authenticated;
revoke all on function public.service_partner_checkout_valid(uuid) from public,anon,authenticated;
revoke all on function public.service_partner_mark_order_paid(uuid) from public,anon,authenticated;

grant execute on function public.service_expire_stale_orders() to service_role;
grant execute on function public.service_expire_stale_partner_requests() to service_role;
grant execute on function public.service_partner_checkout_valid(uuid) to service_role;
grant execute on function public.service_partner_mark_order_paid(uuid) to service_role;
