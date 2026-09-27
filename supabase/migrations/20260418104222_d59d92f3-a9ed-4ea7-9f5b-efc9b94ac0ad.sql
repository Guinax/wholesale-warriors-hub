create table public.bestsellers (
  id uuid primary key default gen_random_uuid(),
  rank integer not null,
  name text not null,
  image_url text,
  units_sold integer not null default 0,
  wholesale_price numeric(10,2) not null,
  unit_price numeric(10,2),
  min_qty integer not null default 12,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  reseller_name text not null,
  city text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text not null,
  product_name text,
  created_at timestamptz not null default now()
);

create table public.commission_tiers (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  min_order numeric(10,2) not null,
  max_order numeric(10,2),
  commission_pct numeric(5,2) not null,
  perks text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.bestsellers enable row level security;
alter table public.reviews enable row level security;
alter table public.commission_tiers enable row level security;

create policy "Public can read bestsellers" on public.bestsellers for select using (true);
create policy "Public can read reviews" on public.reviews for select using (true);
create policy "Public can read commission tiers" on public.commission_tiers for select using (true);