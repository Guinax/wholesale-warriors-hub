alter table public.partner_stores
  add column if not exists delivery_mode text not null default 'hybrid'
    check (delivery_mode in ('own','third_party','hybrid')),
  add column if not exists own_driver_available boolean not null default false;

alter table public.orders
  add column if not exists fulfillment_store_id uuid references public.partner_stores(id) on delete set null,
  add column if not exists delivery_mode text
    check (delivery_mode is null or delivery_mode in ('own','third_party','central')),
  add column if not exists delivery_quote numeric(12,2)
    check (delivery_quote is null or delivery_quote >= 0);

create index if not exists orders_fulfillment_store_idx on public.orders(fulfillment_store_id);
create index if not exists partner_stores_dispatch_idx
  on public.partner_stores(status,is_open,own_driver_available);

grant select, update on public.partner_stores to authenticated;
grant select on public.partner_stores to service_role;
grant select, insert, update, delete on public.orders to service_role;

alter table public.partner_stores enable row level security;
drop policy if exists partner_stores_owner_delivery_update on public.partner_stores;
create policy partner_stores_owner_delivery_update
on public.partner_stores for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);
