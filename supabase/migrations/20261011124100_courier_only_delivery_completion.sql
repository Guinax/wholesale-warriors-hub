-- Only the assigned courier can complete a local partner delivery.
-- Store owners may dispatch, but the customer delivery code belongs only to the courier finalization flow.
do $$
declare d text;
begin
  select pg_get_functiondef('private.partner_command(text,jsonb)'::regprocedure) into d;

  d := replace(
    d,
    '    if s.status<>''approved'' or (s.owner_id is distinct from u and not (p_action=''deliver'' and exists(select 1 from public.courier_jobs cj join public.courier_profiles cp on cp.id=cj.courier_id where cj.request_id=r.id and cj.status in (''picked_up'',''delivering'') and cp.user_id=u))) then raise exception ''Acesso restrito.'' using errcode=''42501''; end if;',
    '    if p_action=''dispatch'' then
      if s.status<>''approved'' or s.owner_id is distinct from u then raise exception ''Acesso restrito.'' using errcode=''42501''; end if;
    else
      if s.status<>''approved'' or not exists(select 1 from public.courier_jobs cj join public.courier_profiles cp on cp.id=cj.courier_id where cj.request_id=r.id and cj.status in (''picked_up'',''delivering'') and cp.user_id=u) then raise exception ''A conclusão da entrega é exclusiva do entregador atribuído.'' using errcode=''42501''; end if;
    end if;'
  );

  execute d;
end $$;
