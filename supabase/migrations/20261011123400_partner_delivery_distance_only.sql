-- Local partner delivery pricing is distance-only.
-- The route is calculated automatically from store coordinates to customer coordinates.
-- Weight is intentionally ignored for this local delivery flow.
do $$
declare d text;
begin
  select pg_get_functiondef('private.partner_command(text,jsonb)'::regprocedure) into d;

  d := replace(
    d,
    '    km:=(p_payload->>''route_km'')::numeric; kg:=(p_payload->>''weight_kg'')::numeric;',
    '    km:=(p_payload->>''route_km'')::numeric;'
  );

  d := replace(
    d,
    '    if km is null or kg is null or km<0 or km>250 or (km=0 and (r.lat is distinct from s.lat or r.lng is distinct from s.lng)) or kg<=0 or kg>1000 or km<private.partner_distance(r.lat,r.lng,s.lat,s.lng)*0.95 then raise exception ''Distância da rota ou peso inválido.''; end if;',
    '    if km is null or km<0 or km>250 or (km=0 and (r.lat is distinct from s.lat or r.lng is distinct from s.lng)) or km<private.partner_distance(r.lat,r.lng,s.lat,s.lng)*0.95 then raise exception ''Distância da rota inválida.''; end if;'
  );

  d := replace(
    d,
    '    update public.partner_requests set route_km=km,weight_kg=kg,quote_source=case',
    '    update public.partner_requests set route_km=km,weight_kg=null,quote_source=case'
  );

  execute d;
end $$;
