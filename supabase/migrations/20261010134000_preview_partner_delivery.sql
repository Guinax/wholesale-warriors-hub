-- Preview only: estimates local retail delivery before a partner accepts.
-- The final charge continues to be calculated by partner_command after acceptance.
create or replace function public.preview_partner_delivery(
  p_lat double precision,
  p_lng double precision,
  p_items jsonb
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_units integer;
  v_distance numeric;
  v_fee numeric;
begin
  if (select auth.uid()) is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90
     or p_lng not between -180 and 180 or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 6 then
    raise exception 'Dados de entrega inválidos.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) x
    where (x->>'product_id') is null or (x->>'qty') !~ '^[1-6]$'
  ) then raise exception 'Itens inválidos.'; end if;
  select sum(qty) into v_units from
    (select (x->>'qty')::integer qty from jsonb_array_elements(p_items) x) t;
  if v_units not between 1 and 6 then
    raise exception 'Pré-cotação disponível apenas para varejo.';
  end if;
  select private.partner_distance(p_lat,p_lng,s.lat,s.lng)::numeric
  into v_distance
  from public.partner_stores s
  where s.status = 'approved' and s.is_open
    and s.accepted_terms_version = s.terms_version
    and (s.delivery_mode <> 'own' or s.own_driver_available)
    and private.partner_distance(p_lat,p_lng,s.lat,s.lng) <= least(50,s.radius_km)
    and not exists (
      select 1 from (
        select (x->>'product_id')::uuid product_id,sum((x->>'qty')::int) qty
        from jsonb_array_elements(p_items) x group by 1
      ) wanted
      left join public.partner_inventory i on i.store_id=s.id and i.product_id=wanted.product_id
      where i.product_id is null or i.on_hand-i.reserved < wanted.qty
    )
  order by case when s.delivery_mode in ('own','hybrid') and s.own_driver_available then 0 else 1 end,
    private.partner_distance(p_lat,p_lng,s.lat,s.lng),s.id
  limit 1;
  if v_distance is null then return jsonb_build_object('available',false); end if;
  v_fee := 7.50 + greatest(0,ceil(v_distance-3))*1.50;
  return jsonb_build_object('available',true,'estimated_distance_km',round(v_distance,2),
    'estimated_shipping',v_fee,'provisional',true);
end;
$$;
revoke all on function public.preview_partner_delivery(double precision,double precision,jsonb) from public,anon;
grant execute on function public.preview_partner_delivery(double precision,double precision,jsonb) to authenticated;
