create index if not exists partner_restock_orders_store_idx on public.partner_restock_orders(store_id);
create index if not exists partner_restock_order_items_product_idx on public.partner_restock_order_items(product_id);
create index if not exists partner_restock_order_items_order_idx on public.partner_restock_order_items(order_id);
create index if not exists partner_restock_orders_status_created_idx on public.partner_restock_orders(status,created_at desc);

create or replace function private.create_partner_restock_order_impl(
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

revoke all on function private.create_partner_restock_order_impl(uuid,jsonb,text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.create_partner_restock_order_impl(uuid,jsonb,text) to authenticated;

create or replace function public.create_partner_restock_order(
  p_store_id uuid,
  p_items jsonb,
  p_notes text default null
) returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_partner_restock_order_impl(p_store_id,p_items,p_notes);
$$;

revoke all on function public.create_partner_restock_order(uuid,jsonb,text) from public, anon;
grant execute on function public.create_partner_restock_order(uuid,jsonb,text) to authenticated;
