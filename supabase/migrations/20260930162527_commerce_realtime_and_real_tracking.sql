-- Keep the existing ownership/admin RLS policies; replication does not grant access.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
      alter publication supabase_realtime add table public.orders;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'stock_movements') then
      alter publication supabase_realtime add table public.stock_movements;
    end if;
  end if;
end $$;

-- A tracking number is supplied by the carrier after a shipment exists.
-- Preserve NOT NULL/UNIQUE for compatibility with already installed clients.
create or replace function private.initialize_order_tracking()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.tracking_code := 'AGUARDANDO-ENVIO:' || new.order_code;
  return new;
end $$;
revoke all on function private.initialize_order_tracking() from public, anon, authenticated;
drop trigger if exists initialize_order_tracking on public.orders;
create trigger initialize_order_tracking before insert on public.orders
for each row execute function private.initialize_order_tracking();
