create or replace function private.partner_approve_payout(p_request_id uuid,p_actor uuid)
returns void language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.partner_requests r join public.orders o on o.id=r.order_id
  where r.id=p_request_id and r.status='delivered' and o.payment_status='paid')
 then raise exception 'Repasse exige pedido pago e entregue.'; end if;
 update public.partner_payouts set status='approved',approved_by=p_actor,approved_at=now()
 where request_id=p_request_id and status='eligible';
 if not found then raise exception 'Repasse não está elegível para aprovação.'; end if;
end $$;

do $migration$
declare d text;
begin
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='private' and p.proname='partner_command' and pg_get_function_identity_arguments(p.oid)='p_action text, p_payload jsonb';
 d:=replace(d,
 'update public.partner_inventory set on_hand=on_hand-v.qty,reserved=reserved-v.qty,updated_at=now() where store_id=r.store_id and product_id=v.product_id;',
 'update public.partner_inventory set on_hand=on_hand-v.qty,reserved=reserved-v.qty,updated_at=now() where store_id=r.store_id and product_id=v.product_id and on_hand>=v.qty and reserved>=v.qty;
      if not found then raise exception ''Reserva de estoque inconsistente. Entrega bloqueada para conferência.''; end if;');
 if strpos(d,'Reserva de estoque inconsistente')=0 then raise exception 'delivery stock guard patch failed'; end if;
 execute d;
end $migration$;