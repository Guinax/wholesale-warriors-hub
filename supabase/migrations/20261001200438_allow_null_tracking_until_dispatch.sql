-- Tracking codes are optional until a real carrier reference exists.
alter table public.orders
  alter column tracking_code drop not null;

-- Remove legacy placeholders only; preserve any real carrier tracking code.
update public.orders
set tracking_code = null
where tracking_code like 'AGUARDANDO-ENVIO:%'
   or tracking_code like 'FM-P-%';

drop trigger if exists initialize_order_tracking on public.orders;
drop function if exists private.initialize_order_tracking();

-- Customers may create only pending orders without a tracking code.
drop policy if exists orders_payment_insert_guard on public.orders;
create policy orders_payment_insert_guard on public.orders
as restrictive for insert to authenticated
with check (
  payment_status = 'pending'
  and delivery_status = 'aguardando_pagamento'
  and expedition_status = 'pendente'
  and tracking_code is null
  and payment_provider is null
  and payment_nsu is null
  and payment_details is null
  and payment_checked_at is null
  and dispatched_at is null
  and loaded_at is null
  and delivered_at is null
  and total_amount > 0
  and jsonb_typeof(items) = 'array'
  and jsonb_array_length(items) > 0
);

-- Authenticated operational updates may add tracking only after payment.
create or replace function private.guard_order_payment_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') and (
    new.payment_status is distinct from old.payment_status or
    new.payment_nsu is distinct from old.payment_nsu or
    new.payment_provider is distinct from old.payment_provider or
    new.payment_details is distinct from old.payment_details or
    new.payment_checked_at is distinct from old.payment_checked_at or
    new.total_amount is distinct from old.total_amount or
    new.items is distinct from old.items or
    new.user_id is distinct from old.user_id
  ) then
    raise exception 'Payment fields can only be changed by the payment service'
      using errcode = '42501';
  end if;

  if current_user in ('authenticated', 'anon')
     and new.payment_status <> 'paid'
     and (
       new.delivery_status is distinct from old.delivery_status or
       new.expedition_status is distinct from old.expedition_status or
       new.tracking_code is distinct from old.tracking_code or
       new.dispatched_at is distinct from old.dispatched_at or
       new.loaded_at is distinct from old.loaded_at or
       new.delivered_at is distinct from old.delivered_at
     )
  then
    raise exception 'Payment must be confirmed before dispatch'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_order_payment_update() from public;
