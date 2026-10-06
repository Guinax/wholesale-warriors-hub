-- Commit partner stock before courier pickup and never revalidate it after dispatch.
-- Once the courier has the product, delivery completion must not be blocked by a later reservation mismatch.

create or replace function private.partner_commit_reserved_stock(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  r public.partner_requests;
  v record;
begin
  select * into r
  from public.partner_requests
  where id=p_request_id
  for update;

  if not found then
    raise exception 'Pedido parceiro não encontrado.';
  end if;

  if not coalesce(r.reserved,false) then
    return;
  end if;

  if r.status <> 'paid' then
    raise exception 'Pedido precisa estar pago antes da retirada.';
  end if;

  for v in
    select product_id, sum(qty)::integer qty
    from jsonb_to_recordset(r.items) as i(product_id uuid, qty integer)
    group by product_id
  loop
    update public.partner_inventory
       set on_hand=on_hand-v.qty,
           reserved=reserved-v.qty,
           updated_at=now()
     where store_id=r.store_id
       and product_id=v.product_id
       and on_hand>=v.qty
       and reserved>=v.qty;

    if not found then
      raise exception 'Estoque inconsistente. Corrija antes de liberar o entregador.';
    end if;
  end loop;

  update public.partner_requests
     set reserved=false
   where id=r.id;
end
$$;

revoke all on function private.partner_commit_reserved_stock(uuid) from public,anon,authenticated;
grant execute on function private.partner_commit_reserved_stock(uuid) to service_role;

do $patch_partner$
declare
  fn text;
  patched text;
begin
  select pg_get_functiondef(p.oid)
    into fn
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private'
    and p.proname='partner_command'
    and pg_get_function_identity_arguments(p.oid)='p_action text, p_payload jsonb';

  if fn is null then
    raise exception 'private.partner_command(text,jsonb) not found';
  end if;

  patched:=replace(
    fn,
    'update public.partner_inventory set on_hand=on_hand-v.qty,reserved=reserved-v.qty,updated_at=now() where store_id=r.store_id and product_id=v.product_id and on_hand>=v.qty and reserved>=v.qty;
      if not found then raise exception ''Reserva de estoque inconsistente. Entrega bloqueada para conferência.''; end if;',
    'if coalesce(r.reserved,false) then
        perform private.partner_commit_reserved_stock(r.id);
      end if;'
  );

  if patched=fn then
    raise exception 'partner delivery stock completion patch failed';
  end if;

  execute patched;
end
$patch_partner$;

do $patch_courier$
declare
  fn text;
  patched text;
begin
  select pg_get_functiondef(p.oid)
    into fn
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private'
    and p.proname='courier_command'
    and pg_get_function_identity_arguments(p.oid)='p_action text, p_payload jsonb';

  if fn is null then
    raise exception 'private.courier_command(text,jsonb) not found';
  end if;

  patched:=replace(
    fn,
    'if r.status<>''paid'' then raise exception ''Pedido precisa estar pago antes da retirada.''; end if;
    update public.courier_jobs set status=''picked_up'',picked_up_at=now(),updated_at=now() where id=j.id;',
    'if r.status<>''paid'' then raise exception ''Pedido precisa estar pago antes da retirada.''; end if;
    perform private.partner_commit_reserved_stock(r.id);
    update public.courier_jobs set status=''picked_up'',picked_up_at=now(),updated_at=now() where id=j.id;'
  );

  if patched=fn then
    raise exception 'courier pickup stock patch failed';
  end if;

  execute patched;
end
$patch_courier$;
