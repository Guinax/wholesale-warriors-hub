alter table public.courier_payouts
  add column if not exists paid_amount numeric(14,2) not null default 0
  check (paid_amount >= 0 and paid_amount <= amount);

update public.courier_payouts
set paid_amount = amount
where status = 'paid' and paid_amount = 0;

alter table public.courier_payouts
  drop constraint if exists courier_payouts_status_check;

alter table public.courier_payouts
  add constraint courier_payouts_status_check
  check (status in ('pending','partial','paid','cancelled'));

create table if not exists public.courier_payout_accounts (
  courier_id uuid primary key references public.courier_profiles(id) on delete cascade,
  pix_key_type text not null check (pix_key_type in ('cpf','cnpj','email','phone','random')),
  pix_key text not null,
  holder_name text not null,
  holder_document text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courier_payout_accounts enable row level security;

drop policy if exists courier_payout_accounts_read on public.courier_payout_accounts;
create policy courier_payout_accounts_read
on public.courier_payout_accounts
for select to authenticated
using (
  coalesce(public.has_role('admin',(select auth.uid())),false)
  or exists(
    select 1 from public.courier_profiles c
    where c.id=courier_payout_accounts.courier_id
      and c.user_id=(select auth.uid())
  )
);

drop policy if exists courier_payout_accounts_insert on public.courier_payout_accounts;
create policy courier_payout_accounts_insert
on public.courier_payout_accounts
for insert to authenticated
with check (
  exists(
    select 1 from public.courier_profiles c
    where c.id=courier_payout_accounts.courier_id
      and c.user_id=(select auth.uid())
  )
);

drop policy if exists courier_payout_accounts_update on public.courier_payout_accounts;
create policy courier_payout_accounts_update
on public.courier_payout_accounts
for update to authenticated
using (
  exists(
    select 1 from public.courier_profiles c
    where c.id=courier_payout_accounts.courier_id
      and c.user_id=(select auth.uid())
  )
)
with check (
  exists(
    select 1 from public.courier_profiles c
    where c.id=courier_payout_accounts.courier_id
      and c.user_id=(select auth.uid())
  )
);

grant select,insert,update on public.courier_payout_accounts to authenticated;
revoke all on public.courier_payout_accounts from anon;

create table if not exists public.courier_wallet_payments (
  id uuid primary key default gen_random_uuid(),
  courier_id uuid not null references public.courier_profiles(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  receipt_url text not null,
  receipt_reference text,
  paid_at timestamptz not null default now(),
  paid_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists courier_wallet_payments_courier_paid_idx
  on public.courier_wallet_payments(courier_id, paid_at desc);

alter table public.courier_wallet_payments enable row level security;

drop policy if exists courier_wallet_payments_read on public.courier_wallet_payments;
create policy courier_wallet_payments_read
on public.courier_wallet_payments
for select to authenticated
using (
  coalesce(public.has_role('admin',(select auth.uid())),false)
  or exists(
    select 1 from public.courier_profiles c
    where c.id=courier_wallet_payments.courier_id
      and c.user_id=(select auth.uid())
  )
);

grant select on public.courier_wallet_payments to authenticated;
revoke insert,update,delete on public.courier_wallet_payments from authenticated;
revoke all on public.courier_wallet_payments from anon;

drop policy if exists "Couriers upload own wallet receipts" on storage.objects;
create policy "Couriers upload own wallet receipts"
on storage.objects
for insert to authenticated
with check (
  bucket_id='media'
  and (storage.foldername(name))[1]='courier-wallet-receipts'
  and coalesce(public.has_role('admin',(select auth.uid())),false)
);

drop policy if exists "Couriers update own wallet receipts" on storage.objects;
create policy "Couriers update own wallet receipts"
on storage.objects
for update to authenticated
using (
  bucket_id='media'
  and (storage.foldername(name))[1]='courier-wallet-receipts'
  and coalesce(public.has_role('admin',(select auth.uid())),false)
)
with check (
  bucket_id='media'
  and (storage.foldername(name))[1]='courier-wallet-receipts'
  and coalesce(public.has_role('admin',(select auth.uid())),false)
);

drop policy if exists "Couriers delete own wallet receipts" on storage.objects;
create policy "Couriers delete own wallet receipts"
on storage.objects
for delete to authenticated
using (
  bucket_id='media'
  and (storage.foldername(name))[1]='courier-wallet-receipts'
  and coalesce(public.has_role('admin',(select auth.uid())),false)
);

create or replace function public.admin_courier_wallet_pay(
  p_courier_id uuid,
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
  payout_row public.courier_payouts;
  payment_id uuid;
begin
  if u is null or not coalesce(public.has_role('admin',u),false) then
    raise exception 'Acesso restrito.' using errcode='42501';
  end if;

  if not exists(select 1 from public.courier_profiles where id=p_courier_id) then
    raise exception 'Entregador não encontrado.';
  end if;

  if p_amount is null or round(p_amount,2) <= 0 then
    raise exception 'Informe um valor de pagamento válido.';
  end if;

  if nullif(trim(coalesce(p_receipt_url,'')),'') is null then
    raise exception 'Anexe o comprovante PIX antes de dar baixa.';
  end if;

  select coalesce(sum(greatest(0,amount-paid_amount)),0)
    into available
  from public.courier_payouts
  where courier_id=p_courier_id
    and status in ('pending','partial');

  if round(p_amount,2) > available then
    raise exception 'Valor superior ao saldo disponível da carteira.';
  end if;

  remaining := round(p_amount,2);

  for payout_row in
    select *
    from public.courier_payouts
    where courier_id=p_courier_id
      and status in ('pending','partial')
      and paid_amount < amount
    order by created_at,id
    for update
  loop
    exit when remaining <= 0;
    take_amount := least(remaining,payout_row.amount-payout_row.paid_amount);

    update public.courier_payouts
       set paid_amount=paid_amount+take_amount,
           status=case when paid_amount+take_amount>=amount then 'paid' else 'partial' end,
           paid_at=case when paid_amount+take_amount>=amount then now() else paid_at end
     where id=payout_row.id;

    remaining := remaining-take_amount;
  end loop;

  if remaining > 0 then
    raise exception 'Não foi possível conciliar todo o valor da carteira.';
  end if;

  insert into public.courier_wallet_payments(courier_id,amount,receipt_url,receipt_reference,paid_by)
  values(
    p_courier_id,
    round(p_amount,2),
    left(trim(p_receipt_url),1000),
    nullif(left(trim(coalesce(p_receipt_reference,'')),500),''),
    u
  )
  returning id into payment_id;

  select coalesce(sum(greatest(0,amount-paid_amount)),0)
    into available
  from public.courier_payouts
  where courier_id=p_courier_id
    and status in ('pending','partial');

  return jsonb_build_object(
    'ok',true,
    'payment_id',payment_id,
    'paid_amount',round(p_amount,2),
    'available_balance',available,
    'paid_at',now()
  );
end;
$$;

revoke all on function public.admin_courier_wallet_pay(uuid,numeric,text,text) from public,anon;
grant execute on function public.admin_courier_wallet_pay(uuid,numeric,text,text) to authenticated;
