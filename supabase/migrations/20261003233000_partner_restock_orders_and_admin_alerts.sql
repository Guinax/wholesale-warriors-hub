create table if not exists public.partner_restock_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.partner_stores(id) on delete cascade,
  created_by uuid not null default auth.uid(),
  status text not null default 'requested' check (status in ('requested','confirmed','preparing','ready','shipped','received','cancelled')),
  notes text,
  admin_notes text,
  total_amount numeric not null default 0 check (total_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_restock_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.partner_restock_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0 and quantity <= 100000),
  unit_price numeric not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  unique(order_id, product_id)
);

alter table public.partner_restock_orders enable row level security;
alter table public.partner_restock_order_items enable row level security;

drop policy if exists partner_restock_orders_select on public.partner_restock_orders;
create policy partner_restock_orders_select on public.partner_restock_orders
for select to authenticated
using (
  exists (
    select 1 from public.partner_stores s
    where s.id = store_id and s.owner_id = (select auth.uid())
  )
  or public.has_role('admin'::public.app_role, (select auth.uid()))
);

drop policy if exists partner_restock_orders_admin_update on public.partner_restock_orders;
create policy partner_restock_orders_admin_update on public.partner_restock_orders
for update to authenticated
using (public.has_role('admin'::public.app_role, (select auth.uid())))
with check (public.has_role('admin'::public.app_role, (select auth.uid())));

drop policy if exists partner_restock_order_items_select on public.partner_restock_order_items;
create policy partner_restock_order_items_select on public.partner_restock_order_items
for select to authenticated
using (
  exists (
    select 1
    from public.partner_restock_orders o
    join public.partner_stores s on s.id=o.store_id
    where o.id=order_id
      and (s.owner_id=(select auth.uid()) or public.has_role('admin'::public.app_role,(select auth.uid())))
  )
);

create or replace function public.create_partner_restock_order(
  p_store_id uuid,
  p_items jsonb,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_order_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_product uuid;
  v_qty integer;
  v_price numeric;
begin
  if v_user is null then raise exception 'Autenticação necessária.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>100 then
    raise exception 'Informe entre 1 e 100 produtos.';
  end if;

  if not exists (
    select 1 from public.partner_stores s
    where s.id=p_store_id
      and s.owner_id=v_user
      and s.status='approved'
      and s.accepted_terms_version=s.terms_version
  ) then
    raise exception 'Loja não autorizada para solicitar reposição.';
  end if;

  insert into public.partner_restock_orders(store_id,created_by,notes)
  values(p_store_id,v_user,nullif(btrim(coalesce(p_notes,'')),''))
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    if v_qty is null or v_qty <= 0 or v_qty > 100000 then raise exception 'Quantidade inválida.'; end if;

    select wholesale_price into v_price from public.products where id=v_product and active=true;
    if not found then raise exception 'Produto indisponível para reposição.'; end if;

    insert into public.partner_restock_order_items(order_id,product_id,quantity,unit_price)
    values(v_order_id,v_product,v_qty,v_price);

    v_total := v_total + (v_price * v_qty);
  end loop;

  update public.partner_restock_orders set total_amount=v_total where id=v_order_id;
  return v_order_id;
end;
$$;

revoke all on function public.create_partner_restock_order(uuid,jsonb,text) from public, anon;
grant execute on function public.create_partner_restock_order(uuid,jsonb,text) to authenticated;

create or replace function private.notify_admins_partner_restock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_name text;
begin
  select s.name into v_store_name from public.partner_stores s where s.id=new.store_id;

  insert into public.user_notifications(user_id,title,message,type,action_path)
  select ur.user_id,
         'Novo pedido de reposição',
         coalesce(v_store_name,'Parceiro') || ' solicitou reposição de produtos.',
         'partner_restock',
         '/admin?tab=restock'
  from public.user_roles ur
  where ur.role='admin'::public.app_role;

  return new;
end;
$$;

drop trigger if exists trg_notify_admins_partner_restock on public.partner_restock_orders;
create trigger trg_notify_admins_partner_restock
after insert on public.partner_restock_orders
for each row execute function private.notify_admins_partner_restock();

create or replace function private.touch_partner_restock_updated_at()
returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end;
$$;

drop trigger if exists trg_partner_restock_updated_at on public.partner_restock_orders;
create trigger trg_partner_restock_updated_at
before update on public.partner_restock_orders
for each row execute function private.touch_partner_restock_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='partner_restock_orders'
  ) then
    alter publication supabase_realtime add table public.partner_restock_orders;
  end if;
end $$;
