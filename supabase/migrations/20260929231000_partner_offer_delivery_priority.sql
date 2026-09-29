alter table public.partner_offers add column if not exists priority_score numeric not null default 0;

create or replace function private.partner_offer_priority(p_distance numeric,p_delivery_mode text,p_driver boolean)
returns numeric language sql immutable set search_path='' as $$
 select round((greatest(0,100-least(coalesce(p_distance,100),100)))+
 case when p_delivery_mode in ('own','hybrid') and p_driver then 30 else 0 end+
 case when p_delivery_mode='hybrid' then 10 when p_delivery_mode='third_party' then 5 else 0 end,2)
$$;
revoke all on function private.partner_offer_priority(numeric,text,boolean) from public,anon,authenticated;

create index if not exists partner_offers_request_priority_idx on public.partner_offers(request_id,priority_score desc,distance_km,store_id);

create or replace function private.partner_offer_score_trigger()
returns trigger language plpgsql security invoker set search_path='' as $$
declare s public.partner_stores;
begin
 select * into s from public.partner_stores where id=new.store_id;
 if private.partner_delivery_mode_for_store(s) is null then raise exception 'Loja sem capacidade de entrega disponível.'; end if;
 new.priority_score:=private.partner_offer_priority(new.distance_km,s.delivery_mode,s.own_driver_available);
 return new;
end $$;
revoke all on function private.partner_offer_score_trigger() from public,anon,authenticated;
drop trigger if exists partner_offer_score_before_write on public.partner_offers;
create trigger partner_offer_score_before_write before insert or update of distance_km,store_id
on public.partner_offers for each row execute function private.partner_offer_score_trigger();

update public.partner_offers f set priority_score=private.partner_offer_priority(f.distance_km,s.delivery_mode,s.own_driver_available)
from public.partner_stores s where s.id=f.store_id;