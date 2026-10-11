-- Only the authenticated buyer may view the delivery verification code after payment.
create or replace function public.get_my_delivery_code(p_order_code text)
returns text
language sql stable security definer
set search_path = ''
as $$
  select c.code
  from public.orders o
  join public.partner_requests r on r.order_id = o.id
  join private.partner_delivery_codes c on c.request_id = r.id
  where o.order_code = p_order_code
    and o.user_id = (select auth.uid())
    and r.customer_id = (select auth.uid())
    and o.payment_status = 'paid'
    and r.status in ('paid','delivering','delivered')
  limit 1
$$;
revoke all on function public.get_my_delivery_code(text) from public, anon;
grant execute on function public.get_my_delivery_code(text) to authenticated;
