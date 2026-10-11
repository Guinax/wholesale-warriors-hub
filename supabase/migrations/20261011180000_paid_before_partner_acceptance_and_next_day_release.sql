alter table public.partner_payouts
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists credited_at timestamptz,
  add column if not exists available_at timestamptz;

update public.partner_payouts
set credited_at=coalesce(credited_at,approved_at,paid_at,created_at),
    available_at=coalesce(available_at,approved_at,paid_at,created_at);

create index if not exists partner_payouts_store_available_idx
  on public.partner_payouts(store_id,available_at,status);

create or replace function public.partner_prepare_payment(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  u uuid:=auth.uid();
  r public.partner_requests;
  s public.partner_stores;
  f record;
  v record;
  o public.orders;
  code text;
  shipping_value numeric;
  commission_value numeric;
  fee_value numeric;
begin
  if u is null then raise exception 'Faça login para continuar.' using errcode='42501'; end if;

  select * into r from public.partner_requests where id=p_request_id and customer_id=u for update;
  if not found then raise exception 'Solicitação não encontrada.'; end if;

  if r.order_id is not null then
    select * into o from public.orders where id=r.order_id;
    return jsonb_build_object('order_code',o.order_code,'request_id',r.id,'shipping',r.shipping,'total',o.total_amount);
  end if;
  if r.status<>'searching' then raise exception 'Solicitação não está disponível para pagamento.'; end if;

  select f0.store_id,f0.distance_km into f
  from public.partner_offers f0
  join public.partner_stores st on st.id=f0.store_id
  where f0.request_id=r.id and not f0.declined
    and st.status='approved' and st.is_open
    and st.accepted_terms_version=st.terms_version
    and not exists (
      select 1
      from jsonb_to_recordset(r.items) as x(product_id uuid,qty integer)
      left join public.partner_inventory i on i.store_id=st.id and i.product_id=x.product_id
      where i.product_id is null or i.on_hand-i.reserved<x.qty
    )
  order by f0.distance_km,f0.store_id
  limit 1;

  if f.store_id is null then raise exception 'Nenhuma loja parceira disponível para este pedido.'; end if;
  select * into s from public.partner_stores where id=f.store_id for update;

  for v in select * from jsonb_to_recordset(r.items) as x(product_id uuid,qty integer) order by product_id loop
    update public.partner_inventory
      set reserved=reserved+v.qty,updated_at=now()
      where store_id=s.id and product_id=v.product_id and on_hand-reserved>=v.qty;
    if not found then raise exception 'Estoque da loja mudou. Refaça o checkout.'; end if;
  end loop;

  commission_value:=round(r.subtotal*s.commission_bps/10000,2);
  fee_value:=round(r.subtotal*s.fee_bps/10000,2);
  shipping_value:=round((7.50 + greatest(ceil(f.distance_km-3),0)*1.50)::numeric,2);
  code:='FM-P-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20));

  insert into public.orders(
    user_id,order_code,tracking_code,payment_method,payment_status,delivery_status,due_at,
    customer_name,customer_email,customer_phone,address_street,address_number,address_complement,
    address_city,address_state,address_zip,items,total_amount,fulfillment_store_id,delivery_mode,delivery_quote
  ) values(
    u,code,null,'infinitepay','pending','aguardando_pagamento',now()+interval '30 minutes',
    r.customer->>'name',(select email from auth.users where id=u),r.customer->>'phone',
    r.customer->>'street',r.customer->>'number',r.customer->>'complement',r.customer->>'city',
    r.customer->>'state',r.customer->>'zip',r.items,r.subtotal+shipping_value,s.id,
    case when s.delivery_mode in ('own','hybrid') and s.own_driver_available then 'own_driver' else 'third_party' end,
    shipping_value
  ) returning * into o;

  update public.partner_requests
    set store_id=s.id,order_id=o.id,status='payment_pending',reserved=true,
        accepted_at=null,expires_at=o.due_at,commission=commission_value,fee=fee_value,
        shipping=shipping_value,route_km=f.distance_km,weight_kg=null,
        quote_source='checkout_preselection',
        eta_minutes=greatest(10,ceil(f.distance_km*3)::integer)
    where id=r.id;

  insert into private.partner_delivery_codes(request_id,code)
  values(r.id,upper(substr(encode(extensions.gen_random_bytes(6),'hex'),1,8)))
  on conflict(request_id) do nothing;

  insert into public.partner_audit(actor_id,action,entity_id,details)
  values(u,'prepare_payment',r.id,jsonb_build_object('store_id',s.id,'shipping',shipping_value,'total',r.subtotal+shipping_value));

  return jsonb_build_object('order_code',code,'request_id',r.id,'shipping',shipping_value,'total',r.subtotal+shipping_value);
end;
$$;

revoke all on function public.partner_prepare_payment(uuid) from public,anon;
grant execute on function public.partner_prepare_payment(uuid) to authenticated;

create or replace function private.partner_mark_order_paid(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  r public.partner_requests;
  owner_user uuid;
begin
  select * into r from public.partner_requests where order_id=p_order_id for update;
  if not found then return; end if;

  if r.status='payment_pending' then
    update public.partner_requests set status='paid' where id=r.id returning * into r;
  elsif r.status not in ('paid','delivering','delivered','review') then
    raise exception 'Estado do pedido parceiro incompatível com confirmação de pagamento: %',r.status;
  end if;

  if r.status='paid' and r.store_id is not null then
    select owner_id into owner_user from public.partner_stores where id=r.store_id;
    if owner_user is not null then
      insert into public.user_notifications(user_id,title,message,type,action_path)
      values(owner_user,'Novo pedido pago','Pagamento confirmado. Aceite o pedido para iniciar a separação e acionar o entregador.','partner_paid_order','/revendedor');
    end if;
  end if;
end;
$$;

create or replace function public.partner_paid_offers()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare u uuid:=auth.uid();
begin
  if u is null then raise exception 'Faça login para continuar.' using errcode='42501'; end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',r.id,
      'items',r.items,
      'subtotal',r.subtotal,
      'city',r.customer->>'city',
      'distance_km',coalesce(r.route_km,0),
      'partner_merchandise',greatest(0,r.subtotal-r.commission-r.fee)
    ) order by r.created_at),'[]'::jsonb)
    from public.partner_requests r
    join public.partner_stores s on s.id=r.store_id
    join public.orders o on o.id=r.order_id
    where s.owner_id=u
      and r.status='paid'
      and r.accepted_at is null
      and o.payment_status='paid'
  );
end;
$$;

revoke all on function public.partner_paid_offers() from public,anon;
grant execute on function public.partner_paid_offers() to authenticated;

create or replace function public.partner_accept_paid_order(p_request_id uuid,p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  u uuid:=auth.uid();
  r public.partner_requests;
  s public.partner_stores;
  o public.orders;
  v record;
  credit numeric;
  release_at timestamptz;
begin
  if u is null then raise exception 'Faça login para continuar.' using errcode='42501'; end if;

  select r0.* into r from public.partner_requests r0 where r0.id=p_request_id for update;
  if not found or r.store_id is null then raise exception 'Pedido não encontrado.'; end if;
  select * into s from public.partner_stores where id=r.store_id and owner_id=u for update;
  if not found then raise exception 'Acesso restrito.' using errcode='42501'; end if;
  select * into o from public.orders where id=r.order_id for update;
  if o.payment_status is distinct from 'paid' or r.status<>'paid' then
    raise exception 'O pedido só pode ser aceito após confirmação do pagamento.';
  end if;

  if not p_accept then
    if r.accepted_at is not null then raise exception 'Pedido já aceito pela loja.'; end if;
    if r.reserved then
      for v in select * from jsonb_to_recordset(r.items) as x(product_id uuid,qty integer) loop
        update public.partner_inventory
          set reserved=greatest(0,reserved-v.qty),updated_at=now()
          where store_id=r.store_id and product_id=v.product_id;
      end loop;
    end if;
    update public.partner_requests set status='review',reserved=false where id=r.id;
    insert into public.user_notifications(user_id,title,message,type,action_path)
      select ur.user_id,'Pedido pago recusado pela loja','O pedido '||o.order_code||' exige reencaminhamento ou atendimento manual.','admin_partner_review','/admin'
      from public.user_roles ur where ur.role='admin';
    return jsonb_build_object('ok',true,'review',true);
  end if;

  if r.accepted_at is not null then
    return jsonb_build_object('ok',true,'already_accepted',true);
  end if;

  release_at:=((date_trunc('day',timezone('America/Sao_Paulo',now()))+interval '1 day') at time zone 'America/Sao_Paulo');
  credit:=greatest(0,r.subtotal-r.commission-r.fee);

  update public.partner_requests set accepted_at=now() where id=r.id;

  if credit>0 then
    insert into public.partner_payouts(request_id,store_id,amount,status,created_at,credited_at,available_at)
    values(r.id,r.store_id,credit,'eligible',now(),now(),release_at)
    on conflict(request_id) do update set
      amount=excluded.amount,
      credited_at=coalesce(public.partner_payouts.credited_at,excluded.credited_at),
      available_at=coalesce(public.partner_payouts.available_at,excluded.available_at)
      where public.partner_payouts.status not in ('paid','cancelled');
  end if;

  insert into public.courier_jobs(request_id,store_id,source,status,payout)
  values(r.id,r.store_id,'network','searching',greatest(0,coalesce(r.shipping,0)))
  on conflict(request_id) do update set
    courier_id=null,source='network',status='searching',payout=excluded.payout,
    accepted_at=null,picked_up_at=null,delivered_at=null,updated_at=now()
  where public.courier_jobs.status not in ('picked_up','delivering','delivered');

  insert into public.user_notifications(user_id,title,message,type,action_path)
  select cp.user_id,'Nova entrega disponível',
         'Uma coleta foi liberada em '||s.name||'. Abra o painel para aceitar.',
         'courier_job','/motoqueiro'
  from public.courier_profiles cp
  join public.courier_locations cl on cl.courier_id=cp.id
  where cp.status='approved' and cp.is_online
    and cl.updated_at>now()-interval '5 minutes'
    and private.partner_distance(cl.lat,cl.lng,s.lat,s.lng)<=50;

  insert into public.partner_audit(actor_id,action,entity_id,details)
  values(u,'accept_paid_order',r.id,jsonb_build_object('credit',credit,'available_at',release_at));

  return jsonb_build_object('ok',true,'credit',credit,'available_at',release_at);
end;
$$;

revoke all on function public.partner_accept_paid_order(uuid,boolean) from public,anon;
grant execute on function public.partner_accept_paid_order(uuid,boolean) to authenticated;

create or replace function public.admin_partner_wallet_pay(
  p_store_id uuid,
  p_amount numeric,
  p_receipt_url text,
  p_receipt_reference text default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  u uuid := auth.uid();
  remaining numeric(14,2);
  take_amount numeric(14,2);
  available numeric(14,2);
  payout_row public.partner_payouts;
  payment_id uuid;
begin
  if u is null or not coalesce(public.has_role('admin',u),false) then raise exception 'Acesso restrito.' using errcode='42501'; end if;
  if not exists(select 1 from public.partner_stores where id=p_store_id) then raise exception 'Parceiro não encontrado.'; end if;
  if p_amount is null or round(p_amount,2)<=0 then raise exception 'Informe um valor de pagamento válido.'; end if;
  if nullif(trim(coalesce(p_receipt_url,'')),'') is null then raise exception 'Anexe o comprovante PIX antes de dar baixa.'; end if;

  select coalesce(sum(greatest(0,amount-paid_amount)),0) into available
  from public.partner_payouts
  where store_id=p_store_id and status in ('eligible','approved','partial')
    and coalesce(available_at,now())<=now();

  if round(p_amount,2)>available then raise exception 'Valor superior ao saldo liberado da carteira.'; end if;
  remaining:=round(p_amount,2);

  for payout_row in
    select * from public.partner_payouts
    where store_id=p_store_id and status in ('eligible','approved','partial')
      and coalesce(available_at,now())<=now() and paid_amount<amount
    order by coalesce(available_at,credited_at,created_at),id
    for update
  loop
    exit when remaining<=0;
    take_amount:=least(remaining,payout_row.amount-payout_row.paid_amount);
    update public.partner_payouts
      set paid_amount=paid_amount+take_amount,
          status=case when paid_amount+take_amount>=amount then 'paid' else 'partial' end,
          paid_at=case when paid_amount+take_amount>=amount then now() else paid_at end,
          paid_by=u
      where id=payout_row.id;
    remaining:=remaining-take_amount;
  end loop;

  if remaining>0 then raise exception 'Não foi possível conciliar todo o valor liberado.'; end if;

  insert into public.partner_wallet_payments(store_id,amount,receipt_url,receipt_reference,paid_by)
  values(p_store_id,round(p_amount,2),left(trim(p_receipt_url),1000),
         nullif(left(trim(coalesce(p_receipt_reference,'')),500),''),u)
  returning id into payment_id;

  select coalesce(sum(greatest(0,amount-paid_amount)),0) into available
  from public.partner_payouts
  where store_id=p_store_id and status in ('eligible','approved','partial')
    and coalesce(available_at,now())<=now();

  return jsonb_build_object('ok',true,'payment_id',payment_id,'paid_amount',round(p_amount,2),
    'available_balance',available,'paid_at',now());
end;
$$;

revoke all on function public.admin_partner_wallet_pay(uuid,numeric,text,text) from public,anon;
grant execute on function public.admin_partner_wallet_pay(uuid,numeric,text,text) to authenticated;
