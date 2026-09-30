do $migration$
declare d text;
begin
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='private' and p.proname='partner_command' and pg_get_function_identity_arguments(p.oid)='p_action text, p_payload jsonb';
 d:=replace(d,
 'from public.partner_stores st where st.status=''approved'' and st.is_open and st.accepted_terms_version=st.terms_version',
 'from public.partner_stores st where st.status=''approved'' and st.is_open and st.accepted_terms_version=st.terms_version and (st.delivery_mode<>''own'' or st.own_driver_available)');
 d:=replace(d,
 'if s.owner_id is distinct from u or s.status<>''approved'' or r.status not in (''accepted'',''quoted'') then raise exception ''Cotação indisponível.'' using errcode=''42501''; end if;',
 'if s.owner_id is distinct from u or s.status<>''approved'' or r.status not in (''accepted'',''quoted'') then raise exception ''Cotação indisponível.'' using errcode=''42501''; end if;
    if s.delivery_mode=''own'' and not s.own_driver_available then raise exception ''Entregador próprio indisponível. Pause a operação ou disponibilize o entregador antes de cotar.''; end if;');
 if strpos(d,'st.delivery_mode<>''own'' or st.own_driver_available')=0 or strpos(d,'Entregador próprio indisponível')=0 then raise exception 'delivery eligibility patch failed'; end if;
 execute d;
end $migration$;