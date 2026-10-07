do $outer$
declare
  d text;
begin
  select pg_get_functiondef(p.oid)
    into d
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='courier_command';

  if d is null then
    raise exception 'private.courier_command não encontrada';
  end if;

  if position('delivery_result jsonb;' in d)=0 then
    d:=replace(
      d,
      '  payout_value numeric;',
      '  payout_value numeric;' || E'\n  delivery_result jsonb;'
    );
  end if;

  d:=replace(
    d,
    $old$    perform public.partner_command('deliver',jsonb_build_object(
      'request_id',r.id,
      'code',upper(trim(coalesce(p_payload->>'code',''))),
      'adult_verified',coalesce((p_payload->>'adult_verified')::boolean,false)
    ));
    update public.courier_jobs set status='delivered',delivered_at=now(),updated_at=now() where id=j.id;
    insert into public.courier_payouts(job_id,courier_id,amount)
    values(j.id,c.id,greatest(0,coalesce(j.payout,0)))
    on conflict(job_id) do nothing;$old$,
    $new$    delivery_result:=public.partner_command('deliver',jsonb_build_object(
      'request_id',r.id,
      'code',upper(trim(coalesce(p_payload->>'code',''))),
      'adult_verified',coalesce((p_payload->>'adult_verified')::boolean,false)
    ));
    if delivery_result ? 'error' then
      raise exception '%', delivery_result->>'error';
    end if;
    if (select status from public.partner_requests where id=r.id) <> 'delivered' then
      raise exception 'A entrega ainda não foi confirmada pela palavra-chave.';
    end if;
    update public.courier_jobs set status='delivered',delivered_at=now(),updated_at=now() where id=j.id;
    insert into public.courier_payouts(job_id,courier_id,amount)
    values(j.id,c.id,greatest(0,coalesce(j.payout,0)))
    on conflict(job_id) do nothing;$new$
  );

  execute d;
end
$outer$;

comment on function public.courier_command(text,jsonb) is
  'Crédito do entregador somente após entrega confirmada com código/palavra-chave válido.';