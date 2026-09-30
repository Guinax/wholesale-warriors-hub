create or replace function private.guard_order_payment_update()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if old.payment_status in ('expired','cancelled','canceled') and new.payment_status='paid' then
    raise exception 'Pagamento tardio exige reconciliacao manual; estoque ja pode ter sido liberado.' using errcode='23514';
  end if;
  if current_user in ('authenticated','anon') and (
    new.payment_status is distinct from old.payment_status or new.payment_nsu is distinct from old.payment_nsu or
    new.payment_provider is distinct from old.payment_provider or new.payment_details is distinct from old.payment_details or
    new.payment_checked_at is distinct from old.payment_checked_at or new.total_amount is distinct from old.total_amount or
    new.items is distinct from old.items or new.user_id is distinct from old.user_id
  ) then raise exception 'Payment fields can only be changed by the payment service' using errcode='42501'; end if;
  if current_user in ('authenticated','anon') and new.payment_status <> 'paid' and (
    new.delivery_status is distinct from old.delivery_status or new.expedition_status is distinct from old.expedition_status or
    new.dispatched_at is distinct from old.dispatched_at or new.loaded_at is distinct from old.loaded_at or
    new.delivered_at is distinct from old.delivered_at
  ) then raise exception 'Payment must be confirmed before dispatch' using errcode='42501'; end if;
  return new;
end
$$;