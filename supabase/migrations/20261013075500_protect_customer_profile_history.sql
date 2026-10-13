-- Preserve customer profile history outside normal operational-reset tables.
-- This archive does not store passwords or authentication secrets.
create schema if not exists private;

create table if not exists private.customer_profile_archive (
  archive_id bigint generated always as identity primary key,
  user_id uuid not null,
  profile_id uuid,
  event_type text not null check (event_type in ('UPDATE', 'DELETE')),
  snapshot jsonb not null,
  archived_at timestamptz not null default now()
);

revoke all on schema private from public, anon, authenticated;
revoke all on table private.customer_profile_archive from public, anon, authenticated;

create or replace function private.archive_customer_profile_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  insert into private.customer_profile_archive (user_id, profile_id, event_type, snapshot)
  values (old.user_id, old.id, tg_op, to_jsonb(old));
  return old;
end;
$$;

revoke all on function private.archive_customer_profile_change() from public, anon, authenticated;

drop trigger if exists protect_customer_profile_history on public.profiles;
create trigger protect_customer_profile_history
before update or delete on public.profiles
for each row execute function private.archive_customer_profile_change();

comment on table private.customer_profile_archive is
'Protected internal history of customer profile versions. Excluded from operational resets and not exposed to app users.';
