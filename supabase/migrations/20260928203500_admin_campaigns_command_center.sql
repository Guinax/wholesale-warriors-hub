create table if not exists public.admin_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  product_id uuid null,
  name text not null,
  headline text not null default '',
  body text not null default '',
  cta text not null default 'COMPRAR AGORA',
  destination_url text not null default '',
  media_urls text[] not null default '{}',
  platforms text[] not null default '{}',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_campaigns enable row level security;

drop policy if exists admins_select_campaigns on public.admin_campaigns;
create policy admins_select_campaigns on public.admin_campaigns
for select to authenticated
using (exists (
  select 1 from public.user_roles ur
  where ur.user_id = (select auth.uid()) and ur.role::text = 'admin'
));

drop policy if exists admins_insert_campaigns on public.admin_campaigns;
create policy admins_insert_campaigns on public.admin_campaigns
for insert to authenticated
with check (
  created_by = (select auth.uid()) and exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role::text = 'admin'
  )
);

drop policy if exists admins_update_campaigns on public.admin_campaigns;
create policy admins_update_campaigns on public.admin_campaigns
for update to authenticated
using (exists (
  select 1 from public.user_roles ur
  where ur.user_id = (select auth.uid()) and ur.role::text = 'admin'
))
with check (exists (
  select 1 from public.user_roles ur
  where ur.user_id = (select auth.uid()) and ur.role::text = 'admin'
));

drop policy if exists admins_delete_campaigns on public.admin_campaigns;
create policy admins_delete_campaigns on public.admin_campaigns
for delete to authenticated
using (exists (
  select 1 from public.user_roles ur
  where ur.user_id = (select auth.uid()) and ur.role::text = 'admin'
));
