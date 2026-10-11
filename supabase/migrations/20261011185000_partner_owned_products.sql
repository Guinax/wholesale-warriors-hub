create table if not exists public.partner_store_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.partner_stores(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text,
  price numeric(12,2) not null check (price > 0 and price <= 999999.99),
  image_url text,
  on_hand integer not null default 0 check (on_hand between 0 and 1000000),
  reserved integer not null default 0 check (reserved between 0 and on_hand),
  active boolean not null default true,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.partner_store_products enable row level security;

drop policy if exists partner_store_products_owner_select on public.partner_store_products;
create policy partner_store_products_owner_select
on public.partner_store_products for select
to authenticated
using (
  exists (
    select 1 from public.partner_stores s
    where s.id=store_id and (s.owner_id=(select auth.uid()) or public.has_role('admin',(select auth.uid())))
  )
);

revoke all on table public.partner_store_products from anon;
grant select on table public.partner_store_products to authenticated;

create or replace function private.partner_custom_product_create(
  p_store_id uuid,p_name text,p_description text,p_price numeric,p_image_url text,p_on_hand integer
) returns public.partner_store_products
language plpgsql security definer set search_path=''
as $$
declare
  u uuid:=auth.uid();
  s public.partner_stores;
  p public.partner_store_products;
  img text:=nullif(trim(coalesce(p_image_url,'')),'');
begin
  if u is null then raise exception 'Faça login para continuar.' using errcode='42501'; end if;
  select * into s from public.partner_stores where id=p_store_id and owner_id=u for update;
  if not found then raise exception 'Loja não encontrada.' using errcode='42501'; end if;
  if s.status<>'approved' then raise exception 'A loja precisa estar aprovada para cadastrar produtos próprios.'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 2 and 120 then raise exception 'Informe um nome válido.'; end if;
  if p_price is null or p_price<=0 or p_price>999999.99 then raise exception 'Informe um preço válido.'; end if;
  if p_on_hand is null or p_on_hand<0 or p_on_hand>1000000 then raise exception 'Informe uma quantidade válida.'; end if;
  if img is not null and (char_length(img)>1000 or img !~ '^https://') then raise exception 'Imagem inválida.'; end if;

  insert into public.partner_store_products(store_id,name,description,price,image_url,on_hand,created_by)
  values(p_store_id,trim(p_name),nullif(trim(coalesce(p_description,'')),''),round(p_price,2),img,p_on_hand,u)
  returning * into p;
  return p;
end;
$$;

create or replace function private.partner_custom_product_update_stock(p_product_id uuid,p_on_hand integer)
returns public.partner_store_products
language plpgsql security definer set search_path=''
as $$
declare
  u uuid:=auth.uid();
  p public.partner_store_products;
begin
  if u is null then raise exception 'Faça login para continuar.' using errcode='42501'; end if;
  if p_on_hand is null or p_on_hand<0 or p_on_hand>1000000 then raise exception 'Informe uma quantidade válida.'; end if;
  select p0.* into p
  from public.partner_store_products p0
  join public.partner_stores s on s.id=p0.store_id
  where p0.id=p_product_id and s.owner_id=u
  for update of p0;
  if not found then raise exception 'Produto não encontrado.' using errcode='42501'; end if;
  if p_on_hand < p.reserved then raise exception 'A quantidade física não pode ser menor que a quantidade reservada.'; end if;
  update public.partner_store_products set on_hand=p_on_hand,updated_at=now() where id=p.id returning * into p;
  return p;
end;
$$;

create or replace function private.partner_custom_product_delete(p_product_id uuid)
returns boolean
language plpgsql security definer set search_path=''
as $$
declare
  u uuid:=auth.uid();
  p public.partner_store_products;
begin
  if u is null then raise exception 'Faça login para continuar.' using errcode='42501'; end if;
  select p0.* into p
  from public.partner_store_products p0
  join public.partner_stores s on s.id=p0.store_id
  where p0.id=p_product_id and s.owner_id=u
  for update of p0;
  if not found then raise exception 'Produto não encontrado.' using errcode='42501'; end if;
  if p.reserved>0 then raise exception 'Este produto possui quantidade reservada e não pode ser excluído agora.'; end if;
  delete from public.partner_store_products where id=p.id;
  return true;
end;
$$;

revoke all on function private.partner_custom_product_create(uuid,text,text,numeric,text,integer) from public,anon;
revoke all on function private.partner_custom_product_update_stock(uuid,integer) from public,anon;
revoke all on function private.partner_custom_product_delete(uuid) from public,anon;
grant execute on function private.partner_custom_product_create(uuid,text,text,numeric,text,integer) to authenticated;
grant execute on function private.partner_custom_product_update_stock(uuid,integer) to authenticated;
grant execute on function private.partner_custom_product_delete(uuid) to authenticated;

create or replace function public.partner_custom_product_create(
  p_store_id uuid,p_name text,p_description text,p_price numeric,p_image_url text,p_on_hand integer
) returns public.partner_store_products
language sql security invoker set search_path=''
as $$ select private.partner_custom_product_create(p_store_id,p_name,p_description,p_price,p_image_url,p_on_hand) $$;

create or replace function public.partner_custom_product_update_stock(p_product_id uuid,p_on_hand integer)
returns public.partner_store_products
language sql security invoker set search_path=''
as $$ select private.partner_custom_product_update_stock(p_product_id,p_on_hand) $$;

create or replace function public.partner_custom_product_delete(p_product_id uuid)
returns boolean
language sql security invoker set search_path=''
as $$ select private.partner_custom_product_delete(p_product_id) $$;

revoke all on function public.partner_custom_product_create(uuid,text,text,numeric,text,integer) from public,anon;
revoke all on function public.partner_custom_product_update_stock(uuid,integer) from public,anon;
revoke all on function public.partner_custom_product_delete(uuid) from public,anon;
grant execute on function public.partner_custom_product_create(uuid,text,text,numeric,text,integer) to authenticated;
grant execute on function public.partner_custom_product_update_stock(uuid,integer) to authenticated;
grant execute on function public.partner_custom_product_delete(uuid) to authenticated;

create index if not exists partner_store_products_store_active_idx
on public.partner_store_products(store_id,active,name);
