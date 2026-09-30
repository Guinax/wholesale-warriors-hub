create or replace function private.partner_mark_order_paid(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare r public.partner_requests;
begin
 select * into r from public.partner_requests where order_id=p_order_id for update;
 if not found then return; end if;
 if r.status='payment_pending' then
   update public.partner_requests set status='paid' where id=r.id;
 elsif r.status in ('paid','delivering','delivered') then
   return;
 else
   raise exception 'Estado do pedido parceiro incompatível com confirmação de pagamento: %',r.status;
 end if;
end
$$;
revoke all on function private.partner_mark_order_paid(uuid) from public,anon,authenticated;
grant execute on function private.partner_mark_order_paid(uuid) to service_role;