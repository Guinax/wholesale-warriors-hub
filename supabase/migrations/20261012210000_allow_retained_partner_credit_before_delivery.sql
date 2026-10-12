-- A paid order may be accepted before delivery. Its payout is a retained credit.
-- Only settlement transitions require a confirmed delivery.
create or replace function private.partner_payout_guard()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  r public.partner_requests;
  o public.orders;
begin
  select * into r from public.partner_requests where id=new.request_id;
  if r.id is null or r.store_id is distinct from new.store_id then
    raise exception 'Repasse não corresponde ao pedido/parceiro.';
  end if;
  if r.order_id is null then raise exception 'Pedido ainda não foi criado.'; end if;
  select * into o from public.orders where id=r.order_id;
  if o.payment_status is distinct from 'paid' then
    raise exception 'Repasse exige pagamento confirmado.';
  end if;
  -- eligible = retained credit; no delivery required yet.
  -- approved/partial/paid = settlement; delivery must be confirmed.
  if new.status in ('approved','partial','paid') and r.status is distinct from 'delivered' then
    raise exception 'Repasse só pode avançar após pagamento e entrega confirmados.';
  end if;
  if tg_op='UPDATE' and old.status='paid' and new.status is distinct from 'paid' then
    raise exception 'Repasse pago não pode ser reaberto.';
  end if;
  if new.status='approved' and new.approved_by is null then
    raise exception 'Aprovação exige responsável.';
  end if;
  if new.status='paid' and (new.paid_by is null or nullif(trim(new.receipt_reference),'') is null or new.paid_at is null) then
    raise exception 'Pagamento do repasse exige responsável, data e comprovante.';
  end if;
  return new;
end;
$$;
