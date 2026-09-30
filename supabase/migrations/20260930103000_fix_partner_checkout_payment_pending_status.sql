create or replace function private.partner_checkout_valid(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
 select exists(
  select 1 from public.orders o
  join public.partner_requests r on r.order_id=o.id and r.store_id=o.fulfillment_store_id
  where o.id=p_order_id and o.fulfillment_store_id is not null
    and o.payment_status='pending'
    and r.status='payment_pending' and r.reserved
    and o.due_at>now()
    and (r.expires_at is null or r.expires_at>now())
    and not exists(
      select 1 from jsonb_to_recordset(r.items) x(product_id uuid,qty integer)
      where not exists(
        select 1 from public.partner_inventory i
        where i.store_id=r.store_id and i.product_id=x.product_id and i.reserved>=x.qty
      )
    )
 )
$$;
revoke all on function private.partner_checkout_valid(uuid) from public,anon,authenticated;
grant execute on function private.partner_checkout_valid(uuid) to service_role;