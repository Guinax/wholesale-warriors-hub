-- Atomic admin inventory auditing.
-- Keeps balance changes and stock_movements history in the same transaction.

create or replace function public.admin_adjust_central_stock(_product_id uuid, _delta integer)
returns integer
language plpgsql
set search_path = ''
as $function$
declare
  sid uuid;
  q integer;
  r integer;
  nextq integer;
  product_label text;
begin
  if not private.is_admin() then raise exception 'admin required'; end if;
  if _delta = 0 then raise exception 'delta must be non-zero'; end if;

  select id into sid
  from public.inventory_sources
  where name='Estoque Central' and source_type='warehouse' and active=true
  order by created_at
  limit 1;
  if sid is null then raise exception 'central inventory source not found'; end if;

  select name into product_label from public.products where id=_product_id;
  if product_label is null then raise exception 'product not found'; end if;

  select quantity,reserved into q,r
  from public.inventory_balances
  where source_id=sid and product_id=_product_id
  for update;

  if not found then
    q:=0; r:=0;
    insert into public.inventory_balances(source_id,product_id,quantity,reserved,reorder_point)
    values(sid,_product_id,0,0,5)
    returning quantity,reserved into q,r;
  end if;

  nextq:=q+_delta;
  if nextq<r or nextq<0 then raise exception 'insufficient unreserved stock'; end if;

  update public.inventory_balances
  set quantity=nextq,updated_at=now()
  where source_id=sid and product_id=_product_id;

  insert into public.stock_movements(product_id, product_name, qty, reason, created_by)
  values(_product_id, product_label, _delta, 'ajuste administrativo de estoque central', auth.uid());

  return nextq-r;
end;
$function$;

create or replace function public.admin_set_inventory_balance(_source_id uuid, _product_id uuid, _quantity integer)
returns integer
language plpgsql
set search_path = ''
as $function$
declare
  current_quantity integer;
  current_reserved integer;
  delta integer;
  product_label text;
begin
  if not private.is_admin() then raise exception 'admin required'; end if;
  if _quantity<0 then raise exception 'quantity must be non-negative'; end if;

  select name into product_label from public.products where id=_product_id;
  if product_label is null then raise exception 'product not found'; end if;

  select quantity,reserved into current_quantity,current_reserved
  from public.inventory_balances
  where source_id=_source_id and product_id=_product_id
  for update;

  if found then
    if _quantity<current_reserved then raise exception 'quantity cannot be lower than reserved stock'; end if;
    delta := _quantity - current_quantity;
    update public.inventory_balances
    set quantity=_quantity,updated_at=now()
    where source_id=_source_id and product_id=_product_id;
  else
    current_quantity := 0;
    delta := _quantity;
    insert into public.inventory_balances(source_id,product_id,quantity,reserved,reorder_point)
    values(_source_id,_product_id,_quantity,0,5);
  end if;

  if delta <> 0 then
    insert into public.stock_movements(product_id, product_name, qty, reason, created_by)
    values(_product_id, product_label, delta, 'ajuste administrativo de saldo por origem', auth.uid());
  end if;

  return _quantity;
end;
$function$;
