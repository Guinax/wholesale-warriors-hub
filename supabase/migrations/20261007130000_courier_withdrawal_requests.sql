create table if not exists public.courier_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  courier_id uuid not null references public.courier_profiles(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'requested' check (status in ('requested','paid','cancelled','rejected')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id),
  receipt_url text,
  receipt_reference text
);

create index if not exists courier_withdrawal_requests_courier_status_idx
  on public.courier_withdrawal_requests(courier_id,status,requested_at desc);

alter table public.courier_withdrawal_requests enable row level security;

drop policy if exists courier_withdrawal_requests_read on public.courier_withdrawal_requests;
create policy courier_withdrawal_requests_read
on public.courier_withdrawal_requests
for select to authenticated
using (
  coalesce(public.has_role('admin',(select auth.uid())),false)
  or exists(
    select 1 from public.courier_profiles c
    where c.id=courier_withdrawal_requests.courier_id
      and c.user_id=(select auth.uid())
  )
);

grant select on public.courier_withdrawal_requests to authenticated;
revoke insert,update,delete on public.courier_withdrawal_requests from authenticated;
revoke all on public.courier_withdrawal_requests from anon;

alter table public.courier_wallet_payments
  add column if not exists withdrawal_request_id uuid
  references public.courier_withdrawal_requests(id) on delete set null;

create unique index if not exists courier_wallet_payments_withdrawal_request_uidx
  on public.courier_wallet_payments(withdrawal_request_id)
  where withdrawal_request_id is not null;

create or replace function public.courier_request_withdrawal(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  u uuid := auth.uid();
  c public.courier_profiles;
  gross_available numeric(14,2);
  reserved_requests numeric(14,2);
  net_available numeric(14,2);
  request_id uuid;
begin
  if u is null then
    raise exception 'Faça login para continuar.' using errcode='42501';
  end if;

  select * into c
  from public.courier_profiles
  where user_id=u
  for update;

  if not found then
    raise exception 'Perfil de entregador não encontrado.' using errcode='42501';
  end if;

  if c.status <> 'approved' then
    raise exception 'O saque só fica disponível após a aprovação do cadastro.';
  end if;

  if p_amount is null or round(p_amount,2) <= 0 then
    raise exception 'Informe um valor de saque válido.';
  end if;

  select coalesce(sum(greatest(0,amount-paid_amount)),0)
    into gross_available
  from public.courier_payouts
  where courier_id=c.id and status in ('pending','partial');

  select coalesce(sum(amount),0)
    into reserved_requests
  from public.courier_withdrawal_requests
  where courier_id=c.id and status='requested';

  net_available := greatest(0,gross_available-reserved_requests);

  if round(p_amount,2) > net_available then
    raise exception 'Valor solicitado é maior que o saldo disponível para saque.';
  end if;

  insert into public.courier_withdrawal_requests(courier_id,amount)
  values(c.id,round(p_amount,2))
  returning id into request_id;

  return jsonb_build_object(
    'ok',true,
    'request_id',request_id,
    'requested_amount',round(p_amount,2),
    'remaining_available',net_available-round(p_amount,2),
    'requested_at',now()
  );
end;
$$;

create or replace function public.courier_cancel_withdrawal(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  u uuid := auth.uid();
begin
  if u is null then raise exception 'Faça login para continuar.' using errcode='42501'; end if;

  update public.courier_withdrawal_requests w
  set status='cancelled',processed_at=now(),processed_by=u
  where w.id=p_request_id
    and w.status='requested'
    and exists(select 1 from public.courier_profiles c where c.id=w.courier_id and c.user_id=u);

  if not found then raise exception 'Solicitação indisponível para cancelamento.'; end if;
  return jsonb_build_object('ok',true);
end;
$$;

create or replace function public.admin_courier_withdrawal_pay(
  p_request_id uuid,
  p_receipt_url text,
  p_receipt_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  u uuid := auth.uid();
  wr public.courier_withdrawal_requests;
  remaining numeric(14,2);
  take_amount numeric(14,2);
  available numeric(14,2);
  payout_row public.courier_payouts;
  payment_id uuid;
begin
  if u is null or not coalesce(public.has_role('admin',u),false) then
    raise exception 'Acesso restrito.' using errcode='42501';
  end if;

  select * into wr
  from public.courier_withdrawal_requests
  where id=p_request_id
  for update;

  if not found or wr.status<>'requested' then
    raise exception 'Solicitação de saque indisponível ou já processada.';
  end if;

  if nullif(trim(coalesce(p_receipt_url,'')),'') is null then
    raise exception 'Anexe o comprovante PIX antes de dar baixa.';
  end if;

  select coalesce(sum(greatest(0,amount-paid_amount)),0)
    into available
  from public.courier_payouts
  where courier_id=wr.courier_id and status in ('pending','partial');

  if wr.amount > available then
    raise exception 'Saldo atual insuficiente para concluir este saque.';
  end if;

  remaining := wr.amount;

  for payout_row in
    select *
    from public.courier_payouts
    where courier_id=wr.courier_id
      and status in ('pending','partial')
      and paid_amount<amount
    order by created_at,id
    for update
  loop
    exit when remaining<=0;
    take_amount := least(remaining,payout_row.amount-payout_row.paid_amount);

    update public.courier_payouts
       set paid_amount=paid_amount+take_amount,
           status=case when paid_amount+take_amount>=amount then 'paid' else 'partial' end,
           paid_at=case when paid_amount+take_amount>=amount then now() else paid_at end
     where id=payout_row.id;

    remaining := remaining-take_amount;
  end loop;

  if remaining>0 then
    raise exception 'Não foi possível conciliar todo o saque.';
  end if;

  insert into public.courier_wallet_payments(
    courier_id,amount,receipt_url,receipt_reference,paid_by,withdrawal_request_id
  )
  values(
    wr.courier_id,wr.amount,left(trim(p_receipt_url),1000),
    nullif(left(trim(coalesce(p_receipt_reference,'')),500),''),
    u,wr.id
  )
  returning id into payment_id;

  update public.courier_withdrawal_requests
  set status='paid',
      processed_at=now(),
      processed_by=u,
      receipt_url=left(trim(p_receipt_url),1000),
      receipt_reference=nullif(left(trim(coalesce(p_receipt_reference,'')),500),'')
  where id=wr.id;

  return jsonb_build_object(
    'ok',true,
    'payment_id',payment_id,
    'request_id',wr.id,
    'paid_amount',wr.amount,
    'paid_at',now()
  );
end;
$$;

revoke all on function public.courier_request_withdrawal(numeric) from public,anon;
grant execute on function public.courier_request_withdrawal(numeric) to authenticated;

revoke all on function public.courier_cancel_withdrawal(uuid) from public,anon;
grant execute on function public.courier_cancel_withdrawal(uuid) to authenticated;

revoke all on function public.admin_courier_withdrawal_pay(uuid,text,text) from public,anon;
grant execute on function public.admin_courier_withdrawal_pay(uuid,text,text) to authenticated;
