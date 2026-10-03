-- Courier network final state: profiles, assignments, tracking, notifications and payouts.
-- Reasserts the production schema in source control.

create schema if not exists private;

create table if not exists public.courier_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  courier_code text not null unique default ('MM-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  full_name text not null,
  phone text not null,
  cpf text,
  vehicle_type text not null default 'moto',
  vehicle_plate text,
  status text not null default 'pending',
  is_online boolean not null default false,
  max_active_jobs integer not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cnh_number text,
  cnh_category text,
  cnh_expiry date
);

alter table public.courier_profiles add column if not exists cnh_number text;
alter table public.courier_profiles add column if not exists cnh_category text;
alter table public.courier_profiles add column if not exists cnh_expiry date;
alter table public.courier_profiles drop constraint if exists courier_profiles_status_check;
alter table public.courier_profiles add constraint courier_profiles_status_check check (status in ('pending','approved','suspended'));
alter table public.courier_profiles drop constraint if exists courier_profiles_vehicle_type_check;
alter table public.courier_profiles add constraint courier_profiles_vehicle_type_check check (vehicle_type in ('moto','bike','carro','utilitario','caminhao','outro'));
alter table public.courier_profiles drop constraint if exists courier_profiles_max_active_jobs_check;
alter table public.courier_profiles add constraint courier_profiles_max_active_jobs_check check (max_active_jobs between 1 and 3);

create table if not exists public.courier_store_links (
  id uuid primary key default gen_random_uuid(),
  courier_id uuid not null references public.courier_profiles(id) on delete cascade,
  store_id uuid not null references public.partner_stores(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique(courier_id,store_id)
);

create table if not exists public.courier_jobs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.partner_requests(id) on delete cascade,
  store_id uuid not null references public.partner_stores(id) on delete cascade,
  courier_id uuid references public.courier_profiles(id) on delete set null,
  source text not null default 'network',
  status text not null default 'searching',
  payout numeric not null default 0,
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courier_locations (
  courier_id uuid primary key references public.courier_profiles(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  accuracy_m numeric,
  heading numeric,
  speed_mps numeric,
  updated_at timestamptz not null default now()
);

create table if not exists public.courier_payouts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.courier_jobs(id) on delete cascade,
  courier_id uuid not null references public.courier_profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  action_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists courier_profiles_online_idx on public.courier_profiles(status,is_online);
create index if not exists courier_links_store_idx on public.courier_store_links(store_id,status);
create index if not exists courier_jobs_status_idx on public.courier_jobs(status,created_at desc);
create index if not exists courier_jobs_courier_idx on public.courier_jobs(courier_id,status);
create index if not exists courier_jobs_store_idx on public.courier_jobs(store_id,status);
create index if not exists courier_payouts_courier_status_idx on public.courier_payouts(courier_id,status,created_at desc);
create index if not exists user_notifications_user_created_idx on public.user_notifications(user_id,created_at desc);

alter table public.courier_profiles enable row level security;
alter table public.courier_store_links enable row level security;
alter table public.courier_jobs enable row level security;
alter table public.courier_locations enable row level security;
alter table public.courier_payouts enable row level security;
alter table public.user_notifications enable row level security;

drop policy if exists courier_profile_self_select on public.courier_profiles;
create policy courier_profile_self_select on public.courier_profiles
for select to authenticated using (
  user_id=(select auth.uid())
  or coalesce(public.has_role('admin',(select auth.uid())),false)
  or exists(
    select 1 from public.courier_store_links l
    join public.partner_stores s on s.id=l.store_id
    where l.courier_id=courier_profiles.id and l.status='active' and s.owner_id=(select auth.uid())
  )
);

drop policy if exists courier_links_related_select on public.courier_store_links;
create policy courier_links_related_select on public.courier_store_links
for select to authenticated using (
  exists(select 1 from public.courier_profiles c where c.id=courier_store_links.courier_id and c.user_id=(select auth.uid()))
  or exists(select 1 from public.partner_stores s where s.id=courier_store_links.store_id and s.owner_id=(select auth.uid()))
  or coalesce(public.has_role('admin',(select auth.uid())),false)
);

drop policy if exists courier_jobs_related_select on public.courier_jobs;
create policy courier_jobs_related_select on public.courier_jobs
for select to authenticated using (
  exists(select 1 from public.courier_profiles c where c.id=courier_jobs.courier_id and c.user_id=(select auth.uid()))
  or exists(select 1 from public.partner_stores s where s.id=courier_jobs.store_id and s.owner_id=(select auth.uid()))
  or exists(select 1 from public.partner_requests r join public.orders o on o.id=r.order_id where r.id=courier_jobs.request_id and o.user_id=(select auth.uid()))
  or coalesce(public.has_role('admin',(select auth.uid())),false)
  or (status='searching' and exists(select 1 from public.courier_profiles c where c.user_id=(select auth.uid()) and c.status='approved' and c.is_online))
);

drop policy if exists courier_location_related_select on public.courier_locations;
create policy courier_location_related_select on public.courier_locations
for select to authenticated using (
  exists(select 1 from public.courier_profiles c where c.id=courier_locations.courier_id and c.user_id=(select auth.uid()))
  or coalesce(public.has_role('admin',(select auth.uid())),false)
  or exists(select 1 from public.courier_jobs j join public.partner_stores s on s.id=j.store_id where j.courier_id=courier_locations.courier_id and j.status in ('assigned','picked_up','delivering') and s.owner_id=(select auth.uid()))
  or exists(select 1 from public.courier_jobs j join public.partner_requests r on r.id=j.request_id join public.orders o on o.id=r.order_id where j.courier_id=courier_locations.courier_id and j.status in ('assigned','picked_up','delivering') and o.user_id=(select auth.uid()))
);
drop policy if exists courier_location_self_insert on public.courier_locations;
create policy courier_location_self_insert on public.courier_locations
for insert to authenticated with check (
  exists(select 1 from public.courier_profiles c where c.id=courier_locations.courier_id and c.user_id=(select auth.uid()) and c.status='approved')
);
drop policy if exists courier_location_self_update on public.courier_locations;
create policy courier_location_self_update on public.courier_locations
for update to authenticated using (
  exists(select 1 from public.courier_profiles c where c.id=courier_locations.courier_id and c.user_id=(select auth.uid()) and c.status='approved')
) with check (
  exists(select 1 from public.courier_profiles c where c.id=courier_locations.courier_id and c.user_id=(select auth.uid()) and c.status='approved')
);

drop policy if exists courier_payouts_related_select on public.courier_payouts;
create policy courier_payouts_related_select on public.courier_payouts
for select to authenticated using (
  exists(select 1 from public.courier_profiles c where c.id=courier_payouts.courier_id and c.user_id=(select auth.uid()))
  or coalesce(public.has_role('admin',(select auth.uid())),false)
);

drop policy if exists user_notifications_select_own on public.user_notifications;
create policy user_notifications_select_own on public.user_notifications
for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists user_notifications_update_own on public.user_notifications;
create policy user_notifications_update_own on public.user_notifications
for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

grant select on public.courier_profiles,public.courier_store_links,public.courier_jobs,public.courier_locations,public.courier_payouts,public.user_notifications to authenticated;
grant insert,update on public.courier_locations to authenticated;
grant update on public.user_notifications to authenticated;
revoke all on public.courier_profiles,public.courier_store_links,public.courier_jobs,public.courier_locations,public.courier_payouts,public.user_notifications from anon;

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
    update public.courier_profiles set status=p_payload->>'status',is_online=case when p_payload->>'status'='approved' then is_online else false end,updated_at=now()
      where id=(p_payload->>'courier_id')::uuid returning * into c;
    if not found then raise exception 'Entregador não encontrado.'; end if;
    if p_payload->>'status'='approved' then
      insert into public.user_notifications(user_id,title,message,type,action_path)
      values(c.user_id,'Cadastro aprovado','Seu cadastro de entregador foi aprovado. Você já pode começar a trabalhar com a gente.','courier_approved','/motoqueiro');
    end if;
    return jsonb_build_object('ok',true);
  else
    raise exception 'Operação inválida.';
  end if;
end $function$


CREATE OR REPLACE FUNCTION private.partner_courier_command(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  u uuid:=auth.uid();
  s public.partner_stores;
  r public.partner_requests;
  c public.courier_profiles;
  j public.courier_jobs;
  payout_value numeric;
begin
  if u is null then raise exception 'Faça login para continuar.' using errcode='42501'; end if;
  if p_action='dashboard' then
    return jsonb_build_object(
      'couriers',(select coalesce(jsonb_agg(jsonb_build_object(
        'id',c2.id,'courier_code',c2.courier_code,'full_name',c2.full_name,'status',c2.status,'is_online',c2.is_online,'store_id',l.store_id
      )),'[]') from public.courier_store_links l join public.courier_profiles c2 on c2.id=l.courier_id join public.partner_stores s2 on s2.id=l.store_id where s2.owner_id=u and l.status='active'),
      'jobs',(select coalesce(jsonb_agg(jsonb_build_object(
        'id',j2.id,'request_id',j2.request_id,'store_id',j2.store_id,'courier_id',j2.courier_id,
        'source',j2.source,'status',j2.status,'payout',j2.payout,'created_at',j2.created_at,
        'courier_name',c3.full_name,'courier_code',c3.courier_code,
        'courier_lat',l3.lat,'courier_lng',l3.lng,'courier_location_updated_at',l3.updated_at
      ) order by j2.created_at desc),'[]')
      from public.courier_jobs j2
      join public.partner_stores s2 on s2.id=j2.store_id
      left join public.courier_profiles c3 on c3.id=j2.courier_id
      left join public.courier_locations l3 on l3.courier_id=j2.courier_id
      where s2.owner_id=u and j2.status<>'cancelled')
    );
  end if;

  select * into r from public.partner_requests where id=(p_payload->>'request_id')::uuid for update;
  if not found or r.store_id is null then raise exception 'Pedido parceiro não encontrado.'; end if;
  select * into s from public.partner_stores where id=r.store_id and owner_id=u;
  if not found then raise exception 'Acesso restrito.' using errcode='42501'; end if;
  if r.status<>'paid' then raise exception 'A busca de entregador só é liberada após pagamento confirmado.'; end if;
  payout_value:=greatest(0,coalesce(r.shipping,0));

  if p_action='request_network' then
    insert into public.courier_jobs(request_id,store_id,source,status,payout)
    values(r.id,s.id,'network','searching',payout_value)
    on conflict(request_id) do update set
      courier_id=null,source='network',status='searching',payout=excluded.payout,accepted_at=null,picked_up_at=null,delivered_at=null,updated_at=now()
      where public.courier_jobs.status not in ('picked_up','delivering','delivered');
    return jsonb_build_object('ok',true);
  elsif p_action='assign_store_courier' then
    select c2.* into c from public.courier_profiles c2 join public.courier_store_links l on l.courier_id=c2.id
      where c2.id=(p_payload->>'courier_id')::uuid and l.store_id=s.id and l.status='active' and c2.status='approved' and c2.is_online;
    if not found then raise exception 'Entregador da loja indisponível.'; end if;
    insert into public.courier_jobs(request_id,store_id,courier_id,source,status,payout,accepted_at)
    values(r.id,s.id,c.id,'store','assigned',payout_value,now())
    on conflict(request_id) do update set courier_id=excluded.courier_id,source='store',status='assigned',payout=excluded.payout,accepted_at=now(),updated_at=now()
      where public.courier_jobs.status not in ('picked_up','delivering','delivered');
    return jsonb_build_object('ok',true);
  else
    raise exception 'Operação inválida.';
  end if;
end $function$


CREATE OR REPLACE FUNCTION private.partner_link_courier_by_code(p_store_id uuid, p_courier_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); c public.courier_profiles;
begin
  if not exists(select 1 from public.partner_stores where id=p_store_id and owner_id=u) then raise exception 'Acesso restrito.' using errcode='42501'; end if;
  select * into c from public.courier_profiles where courier_code=upper(trim(p_courier_code)) and status='approved';
  if not found then raise exception 'Entregador não encontrado ou ainda não aprovado.'; end if;
  insert into public.courier_store_links(courier_id,store_id,status) values(c.id,p_store_id,'active')
  on conflict(courier_id,store_id) do update set status='active';
  return jsonb_build_object('ok',true,'courier_id',c.id);
end $function$


CREATE OR REPLACE FUNCTION public.courier_command(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ select private.courier_command(p_action,p_payload); $function$


CREATE OR REPLACE FUNCTION public.partner_courier_command(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ select private.partner_courier_command(p_action,p_payload); $function$


CREATE OR REPLACE FUNCTION public.partner_link_courier_by_code(p_store_id uuid, p_courier_code text)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ select private.partner_link_courier_by_code(p_store_id,p_courier_code); $function$


revoke all on function private.courier_command(text,jsonb) from public,anon,authenticated;
revoke all on function private.partner_courier_command(text,jsonb) from public,anon,authenticated;
revoke all on function private.partner_link_courier_by_code(uuid,text) from public,anon,authenticated;

revoke all on function public.courier_command(text,jsonb) from public,anon;
revoke all on function public.partner_courier_command(text,jsonb) from public,anon;
revoke all on function public.partner_link_courier_by_code(uuid,text) from public,anon;
grant execute on function public.courier_command(text,jsonb) to authenticated;
grant execute on function public.partner_courier_command(text,jsonb) to authenticated;
grant execute on function public.partner_link_courier_by_code(uuid,text) to authenticated;

do $realtime$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='courier_profiles') then alter publication supabase_realtime add table public.courier_profiles; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='courier_jobs') then alter publication supabase_realtime add table public.courier_jobs; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='courier_locations') then alter publication supabase_realtime add table public.courier_locations; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='courier_payouts') then alter publication supabase_realtime add table public.courier_payouts; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='user_notifications') then alter publication supabase_realtime add table public.user_notifications; end if;
end $realtime$;
