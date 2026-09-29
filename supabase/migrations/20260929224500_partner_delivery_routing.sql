create or replace function private.partner_delivery_mode_for_store(p_store public.partner_stores)
returns text language sql immutable set search_path='' as $$
  select case
    when p_store.delivery_mode in ('own','hybrid') and p_store.own_driver_available then 'own'
    when p_store.delivery_mode in ('third_party','hybrid') then 'third_party'
    else null
  end
$$;
revoke all on function private.partner_delivery_mode_for_store(public.partner_stores) from public, anon, authenticated;

create or replace function public.partner_set_delivery_availability(
  p_store_id uuid, p_delivery_mode text, p_own_driver_available boolean
) returns void language plpgsql security invoker set search_path='' as $$
begin
  if p_delivery_mode not in ('own','third_party','hybrid') then raise exception 'Modalidade de entrega inválida.'; end if;
  update public.partner_stores set delivery_mode=p_delivery_mode,
    own_driver_available=case when p_delivery_mode='third_party' then false else p_own_driver_available end
  where id=p_store_id and owner_id=(select auth.uid());
  if not found then raise exception 'Loja não encontrada ou acesso negado.' using errcode='42501'; end if;
end $$;
revoke all on function public.partner_set_delivery_availability(uuid,text,boolean) from public, anon;
grant execute on function public.partner_set_delivery_availability(uuid,text,boolean) to authenticated;

create or replace function private.sync_partner_order_fulfillment()
returns trigger language plpgsql security definer set search_path='' as $$
declare s public.partner_stores;
begin
  if new.store_id is null or new.order_id is null then return new; end if;
  select * into s from public.partner_stores where id=new.store_id;
  update public.orders set fulfillment_store_id=new.store_id,
    delivery_mode=private.partner_delivery_mode_for_store(s), delivery_quote=new.shipping
  where id=new.order_id;
  return new;
end $$;
revoke all on function private.sync_partner_order_fulfillment() from public, anon, authenticated;
drop trigger if exists partner_request_sync_order_fulfillment on public.partner_requests;
create trigger partner_request_sync_order_fulfillment after insert or update of store_id,order_id,shipping
on public.partner_requests for each row execute function private.sync_partner_order_fulfillment();

update public.orders o set fulfillment_store_id=r.store_id,
 delivery_mode=private.partner_delivery_mode_for_store(s), delivery_quote=r.shipping
from public.partner_requests r join public.partner_stores s on s.id=r.store_id
where r.order_id=o.id and r.store_id is not null;