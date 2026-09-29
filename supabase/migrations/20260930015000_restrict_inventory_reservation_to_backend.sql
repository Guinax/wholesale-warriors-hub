-- Inventory reservation is a privileged backend operation.
-- The payment-link Edge Function authenticates the customer and validates
-- order ownership, prices, shipping and total before invoking this RPC.
create or replace function public.reserve_order_inventory(_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare ord public.orders%rowtype; item jsonb; pid uuid; needed integer; remaining integer; bal record; take_qty integer;
begin
 select * into ord from public.orders where id=_order_id for update;
 if not found then raise exception 'order not found'; end if;
 if ord.fulfillment_store_id is not null then raise exception 'partner orders use partner inventory'; end if;
 if ord.payment_status<>'pending' then raise exception 'order is not pending'; end if;
 if ord.inventory_reserved_at is not null then return true; end if;
 for item in select * from jsonb_array_elements(ord.items::jsonb) loop
  needed:=coalesce((item->>'qty')::integer,(item->>'quantity')::integer,0); pid:=null;
  if item?'product_id' and nullif(item->>'product_id','') is not null then pid:=(item->>'product_id')::uuid;
  else select id into pid from public.products where name=item->>'name' and active=true limit 1; end if;
  if pid is null or needed<=0 then raise exception 'invalid order item'; end if;
  select coalesce(sum(quantity-reserved),0)::integer into remaining from public.inventory_balances where product_id=pid;
  if remaining<needed then raise exception 'insufficient inventory'; end if;
  remaining:=needed;
  for bal in select id,quantity,reserved from public.inventory_balances where product_id=pid and quantity>reserved order by (quantity-reserved) desc,updated_at asc for update loop
   exit when remaining=0; take_qty:=least(remaining,bal.quantity-bal.reserved);
   update public.inventory_balances set reserved=reserved+take_qty,updated_at=now() where id=bal.id;
   insert into public.order_inventory_reservations(order_id,balance_id,product_id,quantity) values(_order_id,bal.id,pid,take_qty);
   remaining:=remaining-take_qty;
  end loop;
 end loop;
 update public.orders set inventory_reserved_at=now() where id=_order_id;
 return true;
end;$$;
revoke all on function public.reserve_order_inventory(uuid) from public,anon,authenticated;
grant execute on function public.reserve_order_inventory(uuid) to service_role;
