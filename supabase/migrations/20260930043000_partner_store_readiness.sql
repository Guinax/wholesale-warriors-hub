do $migration$
declare d text;
begin
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='private' and p.proname='partner_command' and pg_get_function_identity_arguments(p.oid)='p_action text, p_payload jsonb';
 d:=replace(d,
 'if s.status<>''approved'' or s.accepted_terms_version<>s.terms_version then raise exception ''Aprovação e aceite das condições necessários.''; end if;
   update public.partner_stores set is_open=(p_payload->>''is_open'')::boolean,',
 'if s.status<>''approved'' or s.accepted_terms_version<>s.terms_version then raise exception ''Aprovação e aceite das condições necessários.''; end if;
   if coalesce((p_payload->>''is_open'')::boolean,false) and not exists(select 1 from public.partner_inventory i where i.store_id=sid and i.on_hand-i.reserved>0) then raise exception ''Cadastre estoque disponível antes de abrir a loja.''; end if;
   update public.partner_stores set is_open=(p_payload->>''is_open'')::boolean,');
 if strpos(d,'Cadastre estoque disponível antes de abrir a loja.')=0 then raise exception 'readiness guard patch failed'; end if;
 execute d;
end $migration$;