create or replace function private.partner_create_eligible_payout()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare o public.orders; amt numeric;
begin
 if new.status='delivered' and old.status is distinct from 'delivered' and new.order_id is not null and new.store_id is not null then
  select * into o from public.orders where id=new.order_id;
  if o.payment_status='paid' then
   amt:=greatest(0,coalesce(new.subtotal,0)-coalesce(new.commission,0)-coalesce(new.fee,0)+coalesce(new.shipping,0));
   if amt>0 then
    insert into public.partner_payouts(request_id,store_id,amount,status)
    values(new.id,new.store_id,amt,'eligible')
    on conflict(request_id) do nothing;
   end if;
  end if;
 end if;
 return new;
end
$$;
revoke all on function private.partner_create_eligible_payout() from public,anon,authenticated;