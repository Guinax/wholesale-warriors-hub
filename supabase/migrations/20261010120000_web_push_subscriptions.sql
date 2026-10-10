-- Web Push device registrations are only accessible through authenticated Edge Functions.
create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('courier','partner')),
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint web_push_endpoint_https check (endpoint like 'https://%')
);
create index if not exists web_push_subscriptions_user_role_idx
  on public.web_push_subscriptions(user_id, role);
alter table public.web_push_subscriptions enable row level security;
revoke all on public.web_push_subscriptions from anon, authenticated;
-- Explicitly no browser policies: subscriptions contain device secrets.
comment on table public.web_push_subscriptions is
  'Private Web Push registrations. Managed by push-subscriptions Edge Function with verified user ownership.';
