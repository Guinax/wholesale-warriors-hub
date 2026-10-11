-- Move privileged RPC bodies behind the non-exposed private schema and keep only
-- SECURITY INVOKER wrappers in public.

grant usage on schema private to authenticated;

alter function public.admin_courier_wallet_pay(uuid,numeric,text,text) set schema private;
alter function public.admin_courier_withdrawal_pay(uuid,text,text) set schema private;
alter function public.admin_partner_wallet_pay(uuid,numeric,text,text) set schema private;
alter function public.courier_cancel_withdrawal(uuid) set schema private;
alter function public.courier_request_withdrawal(numeric) set schema private;
alter function public.courier_update_photo(text) set schema private;
alter function public.get_my_delivery_code(text) set schema private;
alter function public.partner_accept_paid_order(uuid,boolean) set schema private;
alter function public.partner_heartbeat() set schema private;
alter function public.partner_paid_offers() set schema private;
alter function public.partner_prepare_payment(uuid) set schema private;
alter function public.preview_partner_delivery(double precision,double precision,jsonb) set schema private;

revoke all on function private.admin_courier_wallet_pay(uuid,numeric,text,text) from public,anon;
revoke all on function private.admin_courier_withdrawal_pay(uuid,text,text) from public,anon;
revoke all on function private.admin_partner_wallet_pay(uuid,numeric,text,text) from public,anon;
revoke all on function private.courier_cancel_withdrawal(uuid) from public,anon;
revoke all on function private.courier_request_withdrawal(numeric) from public,anon;
revoke all on function private.courier_update_photo(text) from public,anon;
revoke all on function private.get_my_delivery_code(text) from public,anon;
revoke all on function private.partner_accept_paid_order(uuid,boolean) from public,anon;
revoke all on function private.partner_heartbeat() from public,anon;
revoke all on function private.partner_paid_offers() from public,anon;
revoke all on function private.partner_prepare_payment(uuid) from public,anon;
revoke all on function private.preview_partner_delivery(double precision,double precision,jsonb) from public,anon;

grant execute on function private.admin_courier_wallet_pay(uuid,numeric,text,text) to authenticated;
grant execute on function private.admin_courier_withdrawal_pay(uuid,text,text) to authenticated;
grant execute on function private.admin_partner_wallet_pay(uuid,numeric,text,text) to authenticated;
grant execute on function private.courier_cancel_withdrawal(uuid) to authenticated;
grant execute on function private.courier_request_withdrawal(numeric) to authenticated;
grant execute on function private.courier_update_photo(text) to authenticated;
grant execute on function private.get_my_delivery_code(text) to authenticated;
grant execute on function private.partner_accept_paid_order(uuid,boolean) to authenticated;
grant execute on function private.partner_heartbeat() to authenticated;
grant execute on function private.partner_paid_offers() to authenticated;
grant execute on function private.partner_prepare_payment(uuid) to authenticated;
grant execute on function private.preview_partner_delivery(double precision,double precision,jsonb) to authenticated;

create function public.admin_courier_wallet_pay(p_courier_id uuid,p_amount numeric,p_receipt_url text,p_receipt_reference text default null)
returns jsonb language sql security invoker set search_path='' as
$$ select private.admin_courier_wallet_pay(p_courier_id,p_amount,p_receipt_url,p_receipt_reference) $$;

create function public.admin_courier_withdrawal_pay(p_request_id uuid,p_receipt_url text,p_receipt_reference text default null)
returns jsonb language sql security invoker set search_path='' as
$$ select private.admin_courier_withdrawal_pay(p_request_id,p_receipt_url,p_receipt_reference) $$;

create function public.admin_partner_wallet_pay(p_store_id uuid,p_amount numeric,p_receipt_url text,p_receipt_reference text default null)
returns jsonb language sql security invoker set search_path='' as
$$ select private.admin_partner_wallet_pay(p_store_id,p_amount,p_receipt_url,p_receipt_reference) $$;

create function public.courier_cancel_withdrawal(p_request_id uuid)
returns jsonb language sql security invoker set search_path='' as
$$ select private.courier_cancel_withdrawal(p_request_id) $$;

create function public.courier_request_withdrawal(p_amount numeric)
returns jsonb language sql security invoker set search_path='' as
$$ select private.courier_request_withdrawal(p_amount) $$;

create function public.courier_update_photo(p_photo_url text)
returns jsonb language sql security invoker set search_path='' as
$$ select private.courier_update_photo(p_photo_url) $$;

create function public.get_my_delivery_code(p_order_code text)
returns text language sql stable security invoker set search_path='' as
$$ select private.get_my_delivery_code(p_order_code) $$;

create function public.partner_accept_paid_order(p_request_id uuid,p_accept boolean)
returns jsonb language sql security invoker set search_path='' as
$$ select private.partner_accept_paid_order(p_request_id,p_accept) $$;

create function public.partner_heartbeat()
returns void language sql security invoker set search_path='' as
$$ select private.partner_heartbeat() $$;

create function public.partner_paid_offers()
returns jsonb language sql security invoker set search_path='' as
$$ select private.partner_paid_offers() $$;

create function public.partner_prepare_payment(p_request_id uuid)
returns jsonb language sql security invoker set search_path='' as
$$ select private.partner_prepare_payment(p_request_id) $$;

create function public.preview_partner_delivery(p_lat double precision,p_lng double precision,p_items jsonb)
returns jsonb language sql security invoker set search_path='' as
$$ select private.preview_partner_delivery(p_lat,p_lng,p_items) $$;

revoke all on function public.admin_courier_wallet_pay(uuid,numeric,text,text) from public,anon;
revoke all on function public.admin_courier_withdrawal_pay(uuid,text,text) from public,anon;
revoke all on function public.admin_partner_wallet_pay(uuid,numeric,text,text) from public,anon;
revoke all on function public.courier_cancel_withdrawal(uuid) from public,anon;
revoke all on function public.courier_request_withdrawal(numeric) from public,anon;
revoke all on function public.courier_update_photo(text) from public,anon;
revoke all on function public.get_my_delivery_code(text) from public,anon;
revoke all on function public.partner_accept_paid_order(uuid,boolean) from public,anon;
revoke all on function public.partner_heartbeat() from public,anon;
revoke all on function public.partner_paid_offers() from public,anon;
revoke all on function public.partner_prepare_payment(uuid) from public,anon;
revoke all on function public.preview_partner_delivery(double precision,double precision,jsonb) from public,anon;

grant execute on function public.admin_courier_wallet_pay(uuid,numeric,text,text) to authenticated;
grant execute on function public.admin_courier_withdrawal_pay(uuid,text,text) to authenticated;
grant execute on function public.admin_partner_wallet_pay(uuid,numeric,text,text) to authenticated;
grant execute on function public.courier_cancel_withdrawal(uuid) to authenticated;
grant execute on function public.courier_request_withdrawal(numeric) to authenticated;
grant execute on function public.courier_update_photo(text) to authenticated;
grant execute on function public.get_my_delivery_code(text) to authenticated;
grant execute on function public.partner_accept_paid_order(uuid,boolean) to authenticated;
grant execute on function public.partner_heartbeat() to authenticated;
grant execute on function public.partner_paid_offers() to authenticated;
grant execute on function public.partner_prepare_payment(uuid) to authenticated;
grant execute on function public.preview_partner_delivery(double precision,double precision,jsonb) to authenticated;
