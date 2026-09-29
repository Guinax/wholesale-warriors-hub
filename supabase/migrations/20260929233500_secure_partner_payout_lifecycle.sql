alter table public.partner_payouts alter column status set default 'pending';
alter table public.partner_payouts alter column approved_by drop not null;
alter table public.partner_payouts alter column approved_at drop not null;
alter table public.partner_payouts alter column approved_at drop default;
alter table public.partner_payouts drop constraint if exists partner_payouts_status_check;
alter table public.partner_payouts add constraint partner_payouts_status_check check (status in ('pending','eligible','approved','paid','cancelled'));
create unique index if not exists partner_payouts_one_per_request_idx on public.partner_payouts(request_id);

create or replace function private.partner_payout_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare r public.partner_requests; o public.orders;
begin
 select * into r from public.partner_requests where id=new.request_id;
 if r.id is null or r.store_id is distinct from new.store_id then raise exception 'Repasse não corresponde ao pedido/parceiro.'; end if;
 if r.order_id is null then raise exception 'Pedido ainda não foi criado.'; end if;
 select * into o from public.orders where id=r.order_id;
 if new.status in ('eligible','approved','paid') and (o.payment_status is distinct from 'paid' or r.status is distinct from 'delivered') then raise exception 'Repasse só pode avançar após pagamento e entrega confirmados.'; end if;
 if tg_op='UPDATE' and old.status='paid' and new.status is distinct from 'paid' then raise exception 'Repasse pago não pode ser reaberto.'; end if;
 if new.status='approved' and new.approved_by is null then raise exception 'Aprovação exige responsável.'; end if;
 if new.status='paid' and (new.paid_by is null or nullif(trim(new.receipt_reference),'') is null or new.paid_at is null) then raise exception 'Pagamento do repasse exige responsável, data e comprovante.'; end if;
 return new;
end $$;
revoke all on function private.partner_payout_guard() from public,anon,authenticated;
drop trigger if exists partner_payout_guard_before_write on public.partner_payouts;
create trigger partner_payout_guard_before_write before insert or update on public.partner_payouts for each row execute function private.partner_payout_guard();

create or replace function private.partner_create_eligible_payout() returns trigger language plpgsql security invoker set search_path='' as $$
declare o public.orders; amt numeric;
begin
 if new.status='delivered' and old.status is distinct from 'delivered' and new.order_id is not null and new.store_id is not null then
   select * into o from public.orders where id=new.order_id;
   if o.payment_status='paid' then
     amt:=greatest(0,coalesce(new.subtotal,0)-coalesce(new.commission,0)-coalesce(new.fee,0)+coalesce(new.shipping,0));
     insert into public.partner_payouts(request_id,store_id,amount,status) values(new.id,new.store_id,amt,'eligible') on conflict(request_id) do nothing;
   end if;
 end if;
 return new;
end $$;
revoke all on function private.partner_create_eligible_payout() from public,anon,authenticated;
drop trigger if exists partner_request_create_eligible_payout on public.partner_requests;
create trigger partner_request_create_eligible_payout after update of status on public.partner_requests for each row execute function private.partner_create_eligible_payout();