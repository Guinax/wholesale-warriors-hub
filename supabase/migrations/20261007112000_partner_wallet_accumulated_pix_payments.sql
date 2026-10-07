alter table public.partner_payouts
  add column if not exists paid_amount numeric(14,2) not null default 0
  check (paid_amount >= 0 and paid_amount <= amount);

update public.partner_payouts
set paid_amount = amount
where status = 'paid' and paid_amount = 0;

create table if not exists public.partner_wallet_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.partner_stores(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  receipt_url text not null,
  receipt_reference text,
  paid_at timestamptz not null default now(),
  paid_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists partner_wallet_payments_store_paid_idx
  on public.partner_wallet_payments(store_id, paid_at desc);

alter table public.partner_wallet_payments enable row level security;

drop policy if exists partner_wallet_payments_read on public.partner_wallet_payments;
create policy partner_wallet_payments_read
on public.partner_wallet_payments
for select to authenticated
using (
  coalesce(public.has_role('admin',(select auth.uid())),false)
  or exists (
    select 1 from public.partner_stores s
    where s.id = partner_wallet_payments.store_id
      and s.owner_id = (select auth.uid())
  )
);

revoke all on public.partner_wallet_payments from anon;
revoke insert, update, delete on public.partner_wallet_payments from authenticated;
grant select on public.partner_wallet_payments to authenticated;

create or replace function public.admin_partner_wallet_pay(
  p_store_id uuid,
  p_amount numeric,
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
  remaining numeric(14,2);
  take_amount numeric(14,2);
  available numeric(14,2);
  payout_row public.partner_payouts;
  payment_id uuid;
begin
  if u is null or not coalesce(public.has_role('admin',u),false) then
    raise exception 'Acesso restrito.' using errcode='42501';
  end if;

  if not exists(select 1 from public.partner_stores where id=p_store_id) then
    raise exception 'Parceiro não encontrado.';
  end if;

  if p_amount is null or round(p_amount,2) <= 0 then
    raise exception 'Informe um valor de pagamento válido.';
  end if;

  if nullif(trim(coalesce(p_receipt_url,'')),'') is null then
    raise exception 'Anexe o comprovante PIX antes de dar baixa.';
  end if;

  select coalesce(sum(greatest(0,amount-paid_amount)),0)
    into available
  from public.partner_payouts
  where store_id=p_store_id
    and status in ('eligible','approved','partial');

  if round(p_amount,2) > available then
    raise exception 'Valor superior ao saldo disponível da carteira.';
  end if;

  remaining := round(p_amount,2);

  for payout_row in
    select *
    from public.partner_payouts
    where store_id=p_store_id
      and status in ('eligible','approved','partial')
      and paid_amount < amount
    order by coalesce(approved_at,created_at), created_at, id
    for update
  loop
    exit when remaining <= 0;
    take_amount := least(remaining, payout_row.amount - payout_row.paid_amount);

    update public.partner_payouts
       set paid_amount = paid_amount + take_amount,
           status = case when paid_amount + take_amount >= amount then 'paid' else 'partial' end,
           paid_at = case when paid_amount + take_amount >= amount then now() else paid_at end,
           paid_by = u
     where id=payout_row.id;

    remaining := remaining - take_amount;
  end loop;

  if remaining > 0 then
    raise exception 'Não foi possível conciliar todo o valor da carteira.';
  end if;

  insert into public.partner_wallet_payments(store_id,amount,receipt_url,receipt_reference,paid_by)
  values(
    p_store_id,
    round(p_amount,2),
    left(trim(p_receipt_url),1000),
    nullif(left(trim(coalesce(p_receipt_reference,'')),500),''),
    u
  )
  returning id into payment_id;

  select coalesce(sum(greatest(0,amount-paid_amount)),0)
    into available
  from public.partner_payouts
  where store_id=p_store_id
    and status in ('eligible','approved','partial');

  return jsonb_build_object(
    'ok',true,
    'payment_id',payment_id,
    'paid_amount',round(p_amount,2),
    'available_balance',available,
    'paid_at',now()
  );
end;
$$;

revoke all on function public.admin_partner_wallet_pay(uuid,numeric,text,text) from public,anon;
grant execute on function public.admin_partner_wallet_pay(uuid,numeric,text,text) to authenticated;
