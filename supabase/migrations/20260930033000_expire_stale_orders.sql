create or replace function private.expire_stale_orders()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare n integer;
begin
  update public.orders set payment_status='expired'
  where payment_status='pending' and due_at is not null and due_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function private.expire_stale_orders() from public, anon, authenticated;
grant execute on function private.expire_stale_orders() to service_role;
