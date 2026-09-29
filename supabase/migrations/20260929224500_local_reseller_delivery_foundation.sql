alter table public.inventory_sources
  add column if not exists address_zip text,
  add column if not exists address_street text,
  add column if not exists address_number text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists service_radius_km numeric(8,2),
  add column if not exists local_delivery_enabled boolean not null default false,
  add column if not exists own_driver_enabled boolean not null default false,
  add column if not exists third_party_driver_enabled boolean not null default true,
  add column if not exists local_delivery_fee numeric(10,2) not null default 0,
  add column if not exists local_delivery_eta_minutes integer;

alter table public.orders
  add column if not exists fulfillment_source_id uuid references public.inventory_sources(id) on delete set null,
  add column if not exists delivery_mode text,
  add column if not exists delivery_fee numeric(10,2),
  add column if not exists delivery_assigned_at timestamptz;

create index if not exists orders_fulfillment_source_idx on public.orders(fulfillment_source_id);
create index if not exists inventory_sources_local_delivery_idx
  on public.inventory_sources(active, local_delivery_enabled)
  where active and local_delivery_enabled;

alter table public.orders drop constraint if exists orders_delivery_mode_check;
alter table public.orders add constraint orders_delivery_mode_check
  check (delivery_mode is null or delivery_mode in ('own_driver','third_party','central_carrier'));

alter table public.inventory_sources drop constraint if exists inventory_sources_service_radius_check;
alter table public.inventory_sources add constraint inventory_sources_service_radius_check
  check (service_radius_km is null or service_radius_km > 0);

alter table public.inventory_sources drop constraint if exists inventory_sources_delivery_fee_check;
alter table public.inventory_sources add constraint inventory_sources_delivery_fee_check
  check (local_delivery_fee >= 0);

alter table public.inventory_sources drop constraint if exists inventory_sources_eta_check;
alter table public.inventory_sources add constraint inventory_sources_eta_check
  check (local_delivery_eta_minutes is null or local_delivery_eta_minutes > 0);
