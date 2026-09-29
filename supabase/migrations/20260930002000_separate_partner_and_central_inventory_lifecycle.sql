create or replace function public.orders_inventory_lifecycle()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.fulfillment_store_id is not null then return new; end if;
 if new.payment_status='paid' and old.payment_status is distinct from 'paid' then
  begin perform public.allocate_paid_order_inventory(new.id);
  exception when others then raise warning 'inventory allocation failed for paid order %: %',new.id,sqlerrm; end;
 elsif new.payment_status in ('expired','cancelled','canceled') and old.payment_status is distinct from new.payment_status then
  perform public.release_order_inventory(new.id);
 end if;
 return new;
end $$;

create or replace function private.partner_payment_sync()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.payment_status is distinct from old.payment_status then
  update public.partner_requests
   set status=case when new.payment_status='paid' and status='payment_pending' and reserved then 'paid' else 'review' end
   where order_id=new.id;
  if new.payment_status<>'paid' then
   update public.partner_payouts set status='cancelled'
    where request_id in(select id from public.partner_requests where order_id=new.id)
      and status in ('pending','eligible','approved');
  end if;
 end if;
 return new;
end $$;