create table if not exists public.catalog_settings (
  id integer primary key default 1 check (id = 1),
  title text not null default 'CATÁLOGO VIGENTE',
  subtitle text not null default 'ESTILO CIMED x MAROMBA',
  updated_at timestamptz not null default now()
);

insert into public.catalog_settings (id,title,subtitle)
values (1,'CATÁLOGO VIGENTE','ESTILO CIMED x MAROMBA')
on conflict (id) do nothing;

alter table public.catalog_settings enable row level security;

drop policy if exists catalog_settings_public_read on public.catalog_settings;
create policy catalog_settings_public_read
on public.catalog_settings for select
to anon, authenticated
using (true);

drop policy if exists catalog_settings_admin_insert on public.catalog_settings;
create policy catalog_settings_admin_insert
on public.catalog_settings for insert
to authenticated
with check (private.is_admin());

drop policy if exists catalog_settings_admin_update on public.catalog_settings;
create policy catalog_settings_admin_update
on public.catalog_settings for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

revoke all on table public.catalog_settings from public,anon,authenticated;
grant select on table public.catalog_settings to anon,authenticated;
grant insert,update on table public.catalog_settings to authenticated;
