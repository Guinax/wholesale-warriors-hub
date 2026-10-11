-- Start the courier network search automatically when a local partner order is confirmed as paid.
create or replace function private.partner_mark_order_paid(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $function$
declare
  r public.partner_requests;
  payout_value numeric;
begin
  select * into r
  from public.partner_requests
  where order_id=p_order_id
  for update;

  if not found then
    return;
  end if;

  if r.status='payment_pending' then
    update public.partner_requests
      set status='paid'
      where id=r.id
      returning * into r;
  elsif r.status not in ('paid','delivering','delivered') then
    raise exception 'Estado do pedido parceiro incompatível com confirmação de pagamento: %',r.status;
  end if;

  if r.status='paid' and r.store_id is not null then
    payout_value:=greatest(0,coalesce(r.shipping,0));

    insert into public.courier_jobs(request_id,store_id,source,status,payout)
    values(r.id,r.store_id,'network','searching',payout_value)
    on conflict(request_id) do update set
      courier_id=null,
      source='network',
      status='searching',
      payout=excluded.payout,
      accepted_at=null,
      picked_up_at=null,
      delivered_at=null,
      updated_at=now()
    where public.courier_jobs.status not in ('picked_up','delivering','delivered');
  end if;
end
$function$;

-- Backfill any already-paid request that somehow has no courier search job yet.
insert into public.courier_jobs(request_id,store_id,source,status,payout)
select r.id,r.store_id,'network','searching',greatest(0,coalesce(r.shipping,0))
from public.partner_requests r
where r.status='paid'
  and r.store_id is not null
  and not exists(select 1 from public.courier_jobs j where j.request_id=r.id)
on conflict(request_id) do nothing;
