alter table public.products
  add column if not exists weight_kg numeric,
  add column if not exists width_cm numeric,
  add column if not exists height_cm numeric,
  add column if not exists length_cm numeric;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='products_shipping_dimensions_positive') then
    alter table public.products add constraint products_shipping_dimensions_positive check (
      (weight_kg is null or weight_kg > 0) and
      (width_cm is null or width_cm > 0) and
      (height_cm is null or height_cm > 0) and
      (length_cm is null or length_cm > 0)
    );
  end if;
end $$;

create table if not exists private.melhor_envio_oauth (
  id smallint primary key default 1 check (id=1),
  oauth_state text,
  access_token text,
  refresh_token text,
  token_type text,
  scope text,
  expires_at timestamptz,
  refresh_expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table private.melhor_envio_oauth enable row level security;
revoke all on table private.melhor_envio_oauth from public,anon,authenticated,service_role;

create or replace function public.service_melhor_envio_begin_oauth(p_state text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if length(coalesce(p_state,'')) < 32 then raise exception 'OAuth state inválido.'; end if;
  insert into private.melhor_envio_oauth(id,oauth_state,updated_at)
  values(1,p_state,now())
  on conflict(id) do update set oauth_state=excluded.oauth_state,updated_at=now();
end $$;

create or replace function public.service_melhor_envio_consume_oauth_state(p_state text)
returns boolean language plpgsql security definer set search_path='' as $$
declare ok boolean:=false;
begin
  update private.melhor_envio_oauth set oauth_state=null,updated_at=now()
  where id=1 and oauth_state=p_state returning true into ok;
  return coalesce(ok,false);
end $$;

create or replace function public.service_melhor_envio_store_token(
  p_access_token text,p_refresh_token text,p_token_type text,p_expires_in integer,p_scope text default null
) returns void language plpgsql security definer set search_path='' as $$
begin
  if length(coalesce(p_access_token,''))<20 or length(coalesce(p_refresh_token,''))<20 then raise exception 'Token OAuth inválido.'; end if;
  insert into private.melhor_envio_oauth(id,access_token,refresh_token,token_type,scope,expires_at,refresh_expires_at,updated_at)
  values(1,p_access_token,p_refresh_token,coalesce(nullif(p_token_type,''),'Bearer'),p_scope,
         now()+make_interval(secs=>greatest(coalesce(p_expires_in,2592000),60)),now()+interval '45 days',now())
  on conflict(id) do update set access_token=excluded.access_token,refresh_token=excluded.refresh_token,
    token_type=excluded.token_type,scope=excluded.scope,expires_at=excluded.expires_at,
    refresh_expires_at=excluded.refresh_expires_at,updated_at=now();
end $$;

create or replace function public.service_melhor_envio_token()
returns table(access_token text,refresh_token text,token_type text,scope text,expires_at timestamptz,refresh_expires_at timestamptz)
language sql stable security definer set search_path='' as $$
  select m.access_token,m.refresh_token,m.token_type,m.scope,m.expires_at,m.refresh_expires_at
  from private.melhor_envio_oauth m where m.id=1;
$$;

revoke all on function public.service_melhor_envio_begin_oauth(text) from public,anon,authenticated;
revoke all on function public.service_melhor_envio_consume_oauth_state(text) from public,anon,authenticated;
revoke all on function public.service_melhor_envio_store_token(text,text,text,integer,text) from public,anon,authenticated;
revoke all on function public.service_melhor_envio_token() from public,anon,authenticated;
grant execute on function public.service_melhor_envio_begin_oauth(text) to service_role;
grant execute on function public.service_melhor_envio_consume_oauth_state(text) to service_role;
grant execute on function public.service_melhor_envio_store_token(text,text,text,integer,text) to service_role;
grant execute on function public.service_melhor_envio_token() to service_role;
