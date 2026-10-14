-- Somente parceiros credenciados, abertos e com heartbeat recente podem receber novos pedidos.
-- Heartbeat do painel: 30 segundos. Tolerância operacional: 90 segundos.
-- A Adega Central não participa do sorteio de parceiros: é o fallback do checkout central.
-- Não altera pedidos, clientes, carteiras ou estoques existentes.
create or replace function private.partner_can_receive_new_orders(p_store_id uuid)
returns boolean
language sql stable security invoker set search_path=''
as $$
  select exists (
    select 1 from public.partner_stores s
    where s.id=p_store_id
      and s.status='approved'
      and s.is_open
      and s.accepted_terms_version=s.terms_version
      and s.last_seen_at >= now() - interval '90 seconds'
      and lower(btrim(s.name)) <> 'adega central'
  );
$$;

revoke all on function private.partner_can_receive_new_orders(uuid) from public, anon, authenticated;

do $migration$
declare
  d text;
  old_sql text;
  new_sql text;
begin
  -- Proteger a CRIAÇÃO das ofertas: lojas sem conexão atual não entram no despacho.
  d := pg_get_functiondef('private.partner_command(text,jsonb)'::regprocedure);
  old_sql := 'from public.partner_stores st where st.status=''approved'' and st.is_open and st.accepted_terms_version=st.terms_version and (st.delivery_mode<>''own'' or st.own_driver_available)';
  new_sql := 'from public.partner_stores st where private.partner_can_receive_new_orders(st.id) and (st.delivery_mode<>''own'' or st.own_driver_available)';
  if strpos(d,old_sql)=0 and strpos(d,new_sql)=0 then
    raise exception 'Não foi possível localizar o seletor de ofertas em private.partner_command';
  end if;
  if strpos(d,old_sql)>0 then d := replace(d,old_sql,new_sql); end if;
  -- Se a loja perder conexão durante a oferta, não permitir aceite como parceira online.
  old_sql := 'where f.request_id=rid and st.owner_id=u and not f.declined and f.available_at<=now() and st.status=''approved'' and st.is_open and st.accepted_terms_version=st.terms_version;';
  new_sql := 'where f.request_id=rid and st.owner_id=u and not f.declined and f.available_at<=now() and private.partner_can_receive_new_orders(st.id);';
  if strpos(d,old_sql)=0 and strpos(d,new_sql)=0 then
    raise exception 'Não foi possível localizar a validação de aceite em private.partner_command';
  end if;
  if strpos(d,old_sql)>0 then execute replace(d,old_sql,new_sql); end if;

  -- Validar NOVAMENTE no pagamento para impedir atribuição entre oferta e cobrança.
  d := pg_get_functiondef('private.partner_prepare_payment(uuid)'::regprocedure);
  old_sql := 'and st.status=''approved'' and st.is_open';
  new_sql := 'and private.partner_can_receive_new_orders(st.id)';
  if strpos(d,old_sql)=0 and strpos(d,new_sql)=0 then
    raise exception 'Não foi possível localizar o seletor de pagamento em private.partner_prepare_payment';
  end if;
  if strpos(d,old_sql)>0 then execute replace(d,old_sql,new_sql); end if;

  -- A pré-cotação deve refletir a mesma elegibilidade do despacho.
  d := pg_get_functiondef('private.preview_partner_delivery(double precision,double precision,jsonb)'::regprocedure);
  old_sql := 'where s.status = ''approved'' and s.is_open';
  new_sql := 'where private.partner_can_receive_new_orders(s.id)';
  if strpos(d,old_sql)=0 and strpos(d,new_sql)=0 then
    raise exception 'Não foi possível localizar o seletor de cotação em private.preview_partner_delivery';
  end if;
  if strpos(d,old_sql)>0 then execute replace(d,old_sql,new_sql); end if;
end;
$migration$;
