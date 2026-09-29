create or replace function private.partner_approve_payout(p_request_id uuid,p_actor uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
 update public.partner_payouts
 set status='approved',approved_by=p_actor,approved_at=now()
 where request_id=p_request_id and status='eligible';
 if not found then raise exception 'Repasse não está elegível para aprovação.'; end if;
end $$;
revoke all on function private.partner_approve_payout(uuid,uuid) from public,anon,authenticated;

do $outer$
declare d text;
begin
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='partner_command';
 d:=replace(d,
 $old$insert into public.partner_payouts(request_id,store_id,amount,approved_by) values(rid,r.store_id,r.subtotal-r.commission-r.fee+r.shipping,u);$old$,
 $new$perform private.partner_approve_payout(rid,u);$new$);
 execute d;
end $outer$;