do $$
declare d text;
begin
  select pg_get_functiondef('private.partner_command(text,jsonb)'::regprocedure) into d;

  if position('where req.customer_id=u or st.owner_id=u or adm)' in d)=0 then
    raise exception 'Partner dashboard request visibility pattern not found.';
  end if;
  d:=replace(
    d,
    'where req.customer_id=u or st.owner_id=u or adm)',
    'where req.customer_id=u or (st.owner_id=u and ((req.status=''paid'' and req.accepted_at is not null) or req.status in (''delivering'',''delivered''))) or adm)'
  );

  if position('where st.owner_id=u and st.status=''approved'' and st.is_open and req.status=''searching'' and not f.declined and f.available_at<=now())' in d)=0 then
    raise exception 'Partner dashboard offer visibility pattern not found.';
  end if;
  d:=replace(
    d,
    'where st.owner_id=u and st.status=''approved'' and st.is_open and req.status=''searching'' and not f.declined and f.available_at<=now())',
    'where st.owner_id=u and st.status=''approved'' and st.is_open and req.status=''paid'' and req.store_id=st.id and req.accepted_at is null and not f.declined)'
  );

  execute d;
end
$$;
