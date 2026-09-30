do $migration$
declare d text;
begin
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='private' and p.proname='partner_command' and pg_get_function_identity_arguments(p.oid)='p_action text, p_payload jsonb';
 d:=replace(d,
 'update public.partner_requests set route_km=km,weight_kg=kg,quote_source=''partner_route'',eta_minutes=n,
     shipping=round(s.delivery_base+s.delivery_per_km*km+s.delivery_per_kg*kg,2),status=''quoted'' where id=rid;',
 'update public.partner_requests set route_km=km,weight_kg=kg,quote_source=case when s.delivery_mode in (''own'',''hybrid'') and s.own_driver_available then ''own_driver'' else ''third_party'' end,eta_minutes=n,
     shipping=round(s.delivery_base+s.delivery_per_km*km+s.delivery_per_kg*kg,2),status=''quoted'' where id=rid;');
 d:=replace(d,
 'customer_name,customer_email,customer_phone,address_street,address_number,address_complement,address_city,address_state,address_zip,items,total_amount)
     values(u,code,code,''infinitepay'',''pending'',''aguardando_pagamento'',now()+interval ''30 minutes'',',
 'customer_name,customer_email,customer_phone,address_street,address_number,address_complement,address_city,address_state,address_zip,items,total_amount,fulfillment_store_id,delivery_mode,delivery_quote)
     values(u,code,code,''infinitepay'',''pending'',''aguardando_pagamento'',now()+interval ''30 minutes'',');
 d:=replace(d,
 'r.customer->>''name'',(select email from auth.users where id=u),r.customer->>''phone'',r.customer->>''street'',r.customer->>''number'',r.customer->>''complement'',r.customer->>''city'',r.customer->>''state'',r.customer->>''zip'',r.items,r.subtotal+r.shipping) returning * into o;',
 'r.customer->>''name'',(select email from auth.users where id=u),r.customer->>''phone'',r.customer->>''street'',r.customer->>''number'',r.customer->>''complement'',r.customer->>''city'',r.customer->>''state'',r.customer->>''zip'',r.items,r.subtotal+r.shipping,r.store_id,case when r.quote_source=''own_driver'' then ''own'' else ''third_party'' end,r.shipping) returning * into o;');
 if strpos(d,'fulfillment_store_id,delivery_mode,delivery_quote')=0 then raise exception 'delivery snapshot patch failed'; end if;
 execute d;
end
$migration$;