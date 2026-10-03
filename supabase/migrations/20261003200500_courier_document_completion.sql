-- Allow pending couriers to complete documents and enforce document checks before approval.

CREATE OR REPLACE FUNCTION private.courier_command(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  u uuid := auth.uid();
  c public.courier_profiles;
  j public.courier_jobs;
  r public.partner_requests;
  s public.partner_stores;
  active_count integer;
  target_courier uuid;
  payout_value numeric;
begin
  if u is null then raise exception 'Faça login para continuar.' using errcode='42501'; end if;

  if p_action='register' then
    if exists(select 1 from public.courier_profiles where user_id=u) then
      return jsonb_build_object('ok',true,'already_registered',true);
    end if;
    insert into public.courier_profiles(user_id,full_name,phone,cpf,vehicle_type,vehicle_plate,cnh_number,cnh_category,cnh_expiry)
    values(
      u,
      left(trim(coalesce(p_payload->>'full_name','')),120),
      left(trim(coalesce(p_payload->>'phone','')),40),
      nullif(regexp_replace(coalesce(p_payload->>'cpf',''),'\D','','g'),''),
      coalesce(nullif(p_payload->>'vehicle_type',''),'moto'),
      nullif(upper(trim(coalesce(p_payload->>'vehicle_plate',''))),''),
      nullif(regexp_replace(coalesce(p_payload->>'cnh_number',''),'\D','','g'),''),
      nullif(upper(trim(coalesce(p_payload->>'cnh_category',''))),''),
      nullif(p_payload->>'cnh_expiry','')::date
    ) returning * into c;
    if length(c.full_name)<3 or length(regexp_replace(c.phone,'\D','','g'))<8 then raise exception 'Informe nome e telefone válidos.'; end if;
    if length(coalesce(c.cpf,''))<>11 then raise exception 'Informe um CPF com 11 dígitos.'; end if;
    if c.vehicle_type<>'bike' then
      if length(coalesce(c.cnh_number,''))<>11 then raise exception 'Informe o número da CNH com 11 dígitos.'; end if;
      if coalesce(c.cnh_category,'')='' then raise exception 'Informe a categoria da CNH.'; end if;
      if c.cnh_expiry is null then raise exception 'Informe a validade da CNH.'; end if;
      if coalesce(c.vehicle_plate,'')='' then raise exception 'Informe a placa do veículo.'; end if;
    end if;
    return jsonb_build_object('ok',true,'courier_code',c.courier_code);
  end if;

  select * into c from public.courier_profiles where user_id=u for update;
  if p_action not in ('admin_status','admin_mark_payout_paid','tracking') and not found then raise exception 'Cadastre-se como entregador primeiro.' using errcode='42501'; end if;

  if p_action='dashboard' then
    return jsonb_build_object(
      'profile',to_jsonb(c),
      'links',(select coalesce(jsonb_agg(jsonb_build_object('store_id',l.store_id,'store_name',s.name,'status',l.status)),'[]') from public.courier_store_links l join public.partner_stores s on s.id=l.store_id where l.courier_id=c.id),
      'payouts',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'job_id',p.job_id,'amount',p.amount,'status',p.status,'created_at',p.created_at,'paid_at',p.paid_at) order by p.created_at desc),'[]') from public.courier_payouts p where p.courier_id=c.id),
      'pending_payout_total',(select coalesce(sum(p.amount),0) from public.courier_payouts p where p.courier_id=c.id and p.status='pending'),
      'jobs',(select coalesce(jsonb_agg(jsonb_build_object(
        'id',j2.id,'request_id',j2.request_id,'status',j2.status,'source',j2.source,'payout',j2.payout,
        'store_name',s2.name,'store_lat',s2.lat,'store_lng',s2.lng,
        'customer_city',r2.customer->>'city','customer_street',case when j2.courier_id=c.id then r2.customer->>'street' else null end,
        'customer_number',case when j2.courier_id=c.id then r2.customer->>'number' else null end,
        'dropoff_lat',case when j2.courier_id=c.id then r2.lat else null end,'dropoff_lng',case when j2.courier_id=c.id then r2.lng else null end,
        'items',r2.items,'route_km',r2.route_km,'eta_minutes',r2.eta_minutes,'created_at',j2.created_at
      ) order by j2.created_at desc),'[]')
      from public.courier_jobs j2
      join public.partner_requests r2 on r2.id=j2.request_id
      join public.partner_stores s2 on s2.id=j2.store_id
      where (j2.courier_id=c.id or (j2.status='searching' and c.status='approved' and c.is_online and exists (select 1 from public.courier_locations cl where cl.courier_id=c.id and cl.updated_at>now()-interval '5 minutes' and private.partner_distance(cl.lat,cl.lng,s2.lat,s2.lng)<=50)))
        and j2.status<>'cancelled')
    );
  elsif p_action='update_documents' then
    if c.status='approved' then raise exception 'Cadastro já aprovado.'; end if;
    update public.courier_profiles set
      cpf=nullif(regexp_replace(coalesce(p_payload->>'cpf',''),'\D','','g'),''),
      vehicle_type=coalesce(nullif(p_payload->>'vehicle_type',''),vehicle_type),
      vehicle_plate=nullif(upper(trim(coalesce(p_payload->>'vehicle_plate',''))),''),
      cnh_number=nullif(regexp_replace(coalesce(p_payload->>'cnh_number',''),'\D','','g'),''),
      cnh_category=nullif(upper(trim(coalesce(p_payload->>'cnh_category',''))),''),
      cnh_expiry=nullif(p_payload->>'cnh_expiry','')::date,
      updated_at=now()
    where id=c.id returning * into c;
    if length(coalesce(c.cpf,''))<>11 then raise exception 'Informe um CPF com 11 dígitos.'; end if;
    if c.vehicle_type<>'bike' then
      if length(coalesce(c.cnh_number,''))<>11 then raise exception 'Informe o número da CNH com 11 dígitos.'; end if;
      if coalesce(c.cnh_category,'')='' then raise exception 'Informe a categoria da CNH.'; end if;
      if c.cnh_expiry is null then raise exception 'Informe a validade da CNH.'; end if;
      if coalesce(c.vehicle_plate,'')='' then raise exception 'Informe a placa do veículo.'; end if;
    end if;
    return jsonb_build_object('ok',true);
  elsif p_action='toggle_online' then
    if c.status<>'approved' then raise exception 'Seu cadastro ainda não foi aprovado.'; end if;
    update public.courier_profiles set is_online=coalesce((p_payload->>'online')::boolean,false),updated_at=now() where id=c.id returning * into c;
    return jsonb_build_object('ok',true,'online',c.is_online);
  elsif p_action='location' then
    if c.status<>'approved' or not c.is_online then raise exception 'Fique online para compartilhar localização.'; end if;
    insert into public.courier_locations(courier_id,lat,lng,accuracy_m,heading,speed_mps,updated_at)
    values(c.id,(p_payload->>'lat')::float8,(p_payload->>'lng')::float8,(p_payload->>'accuracy_m')::numeric,(p_payload->>'heading')::numeric,(p_payload->>'speed_mps')::numeric,now())
    on conflict(courier_id) do update set lat=excluded.lat,lng=excluded.lng,accuracy_m=excluded.accuracy_m,heading=excluded.heading,speed_mps=excluded.speed_mps,updated_at=now();
    return jsonb_build_object('ok',true);
  elsif p_action='accept_job' then
    if c.status<>'approved' or not c.is_online then raise exception 'Fique online para aceitar corridas.'; end if;
    select * into j from public.courier_jobs where id=(p_payload->>'job_id')::uuid for update;
    if not found or j.status<>'searching' or j.courier_id is not null then raise exception 'Corrida indisponível ou já aceita.'; end if;
    select count(*) into active_count from public.courier_jobs where courier_id=c.id and status in ('assigned','picked_up','delivering');
    if active_count>=c.max_active_jobs then raise exception 'Você já atingiu seu limite de entregas ativas.'; end if;
    update public.courier_jobs set courier_id=c.id,status='assigned',accepted_at=now(),updated_at=now() where id=j.id;
    return jsonb_build_object('ok',true,'job_id',j.id);
  elsif p_action='pickup_job' then
    select * into j from public.courier_jobs where id=(p_payload->>'job_id')::uuid and courier_id=c.id for update;
    if not found or j.status<>'assigned' then raise exception 'Corrida não está pronta para retirada.'; end if;
    select * into r from public.partner_requests where id=j.request_id for update;
    if r.status<>'paid' then raise exception 'Pedido precisa estar pago antes da retirada.'; end if;
    update public.courier_jobs set status='picked_up',picked_up_at=now(),updated_at=now() where id=j.id;
    update public.partner_requests set status='delivering' where id=r.id;
    update public.orders set delivery_status='saiu_entrega',dispatched_at=coalesce(dispatched_at,now()) where id=r.order_id;
    return jsonb_build_object('ok',true);
  elsif p_action='start_delivery' then
    select * into j from public.courier_jobs where id=(p_payload->>'job_id')::uuid and courier_id=c.id for update;
    if not found or j.status not in ('picked_up','delivering') then raise exception 'Retire o pedido antes de iniciar a entrega.'; end if;
    update public.courier_jobs set status='delivering',updated_at=now() where id=j.id;
    return jsonb_build_object('ok',true);
  elsif p_action='deliver_job' then
    select * into j from public.courier_jobs where id=(p_payload->>'job_id')::uuid and courier_id=c.id for update;
    if not found or j.status not in ('picked_up','delivering') then raise exception 'Entrega indisponível.'; end if;
    select * into r from public.partner_requests where id=j.request_id for update;
    perform public.partner_command('deliver',jsonb_build_object(
      'request_id',r.id,
      'code',upper(trim(coalesce(p_payload->>'code',''))),
      'adult_verified',coalesce((p_payload->>'adult_verified')::boolean,false)
    ));
    update public.courier_jobs set status='delivered',delivered_at=now(),updated_at=now() where id=j.id;
    insert into public.courier_payouts(job_id,courier_id,amount)
    values(j.id,c.id,greatest(0,coalesce(j.payout,0)))
    on conflict(job_id) do nothing;
    return jsonb_build_object('ok',true);
  elsif p_action='tracking' then
    select j2.* into j from public.courier_jobs j2
      join public.partner_requests r2 on r2.id=j2.request_id
      join public.orders o2 on o2.id=r2.order_id
      where o2.id=(p_payload->>'order_id')::uuid
        and (o2.user_id=u or exists(select 1 from public.partner_stores s2 where s2.id=j2.store_id and s2.owner_id=u) or coalesce(public.has_role('admin',u),false))
      order by j2.created_at desc limit 1;
    if not found or j.courier_id is null then return jsonb_build_object('tracking',null); end if;
    return jsonb_build_object('tracking',(
      select jsonb_build_object(
        'courier_id',c2.id,'courier_code',c2.courier_code,'first_name',split_part(c2.full_name,' ',1),
        'job_status',j.status,'lat',l.lat,'lng',l.lng,'accuracy_m',l.accuracy_m,'updated_at',l.updated_at
      )
      from public.courier_profiles c2 left join public.courier_locations l on l.courier_id=c2.id where c2.id=j.courier_id
    ));
  elsif p_action='admin_mark_payout_paid' then
    if not coalesce(public.has_role('admin',u),false) then raise exception 'Acesso restrito.' using errcode='42501'; end if;
    update public.courier_payouts
      set status='paid',paid_at=now()
      where courier_id=(p_payload->>'courier_id')::uuid and status='pending';
    return jsonb_build_object('ok',true);
  elsif p_action='admin_status' then
    if not coalesce(public.has_role('admin',u),false) then raise exception 'Acesso restrito.' using errcode='42501'; end if;
    target_courier:=(p_payload->>'courier_id')::uuid;
    select * into c from public.courier_profiles where id=target_courier for update;
    if not found then raise exception 'Entregador não encontrado.'; end if;
    if p_payload->>'status'='approved' then
      if length(coalesce(c.cpf,''))<>11 then raise exception 'CPF obrigatório antes da aprovação.'; end if;
      if c.vehicle_type<>'bike' then
        if length(coalesce(c.cnh_number,''))<>11 or coalesce(c.cnh_category,'')='' or c.cnh_expiry is null or coalesce(c.vehicle_plate,'')='' then
          raise exception 'Complete CNH e dados do veículo antes da aprovação.';
        end if;
      end if;
    end if;
    update public.courier_profiles
      set status=p_payload->>'status',
          is_online=case when p_payload->>'status'='approved' then is_online else false end,
          updated_at=now()
      where id=c.id;
    if p_payload->>'status'='approved' and c.status<>'approved' then
      insert into public.user_notifications(user_id,title,message,type,action_path)
      values(c.user_id,'Cadastro aprovado','Seu cadastro de entregador foi aprovado. Você já pode começar a trabalhar com a gente.','courier_approved','/motoqueiro');
    end if;
    return jsonb_build_object('ok',true);
  else
    raise exception 'Operação inválida.';
  end if;
end $function$

