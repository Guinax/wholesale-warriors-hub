-- Enforce a maximum one-hour payment window for pending orders.
-- Existing pending orders are clamped to created_at + 1 hour.
update public.orders
set due_at = created_at + interval '1 hour'
where payment_status = 'pending'
  and (due_at is null or due_at > created_at + interval '1 hour');

create or replace function private.expire_stale_orders()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare n integer;
begin
  update public.orders
  set payment_status='expired'
  where payment_status='pending'
    and coalesce(due_at, created_at + interval '1 hour') <= now();

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function private.expire_stale_orders() from public, anon, authenticated;
grant execute on function private.expire_stale_orders() to service_role;
