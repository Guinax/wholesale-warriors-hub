-- Protect customer destination until the courier explicitly starts the delivery route.
-- Keeps the database response aligned with the courier UI workflow.

do $migration$
declare
  d text;
begin
  select pg_get_functiondef(p.oid) into d
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and p.proname = 'courier_command'
    and pg_get_function_identity_arguments(p.oid) = 'p_action text, p_payload jsonb';

  if d is null then
    raise exception 'private.courier_command not found';
  end if;

  -- Older implementations exposed the full destination as soon as a job was assigned.
  d := replace(
    d,
    '''customer_street'',case when j2.courier_id=c.id then r2.customer->>''street'' else null end,',
    '''customer_street'',case when j2.courier_id=c.id and j2.status=''delivering'' then r2.customer->>''street'' else null end,'
  );
  d := replace(
    d,
    '''customer_number'',case when j2.courier_id=c.id then r2.customer->>''number'' else null end,',
    '''customer_number'',case when j2.courier_id=c.id and j2.status=''delivering'' then r2.customer->>''number'' else null end,'
  );
  d := replace(
    d,
    '''dropoff_lat'',case when j2.courier_id=c.id then r2.lat else null end,''dropoff_lng'',case when j2.courier_id=c.id then r2.lng else null end,',
    '''dropoff_lat'',case when j2.courier_id=c.id and j2.status=''delivering'' then r2.lat else null end,''dropoff_lng'',case when j2.courier_id=c.id and j2.status=''delivering'' then r2.lng else null end,'
  );

  -- A delivery cannot be completed from the picked_up state.
  d := replace(
    d,
    'if not found or j.status not in (''picked_up'',''delivering'') then raise exception ''Entrega indisponível.''; end if;',
    'if not found or j.status<>''delivering'' then raise exception ''Inicie o percurso antes de concluir a entrega.''; end if;'
  );

  if strpos(d, 'j2.status=''delivering'' then r2.customer->>''street''') = 0
     or strpos(d, 'j2.status=''delivering'' then r2.lat') = 0
     or strpos(d, 'j.status<>''delivering''') = 0 then
    raise exception 'courier destination protection patch failed';
  end if;

  execute d;
end
$migration$;
