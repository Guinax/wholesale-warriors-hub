create or replace function private.expire_stale_partner_requests()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare r record; x record; n integer := 0;
begin
 for r in
  select id,store_id,items,reserved
  from public.partner_requests
  where expires_at is not null
    and expires_at < now()
    and status in ('searching','accepted','quoted')
  for update skip locked
 loop
  if r.reserved then
   for x in select product_id,sum(qty)::integer qty from jsonb_to_recordset(r.items) as i(product_id uuid,qty integer) group by product_id loop
    update public.partner_inventory
    set reserved=reserved-x.qty,updated_at=now()
    where store_id=r.store_id and product_id=x.product_id and reserved>=x.qty;
    if not found then raise exception 'Reserva de estoque inconsistente ao expirar solicitação %.',r.id; end if;
   end loop;
  end if;
  update public.partner_requests set status='expired',reserved=false where id=r.id;
  n:=n+1;
 end loop;
 return n;
end
$$;
revoke all on function private.expire_stale_partner_requests() from public,anon,authenticated;
grant execute on function private.expire_stale_partner_requests() to service_role;