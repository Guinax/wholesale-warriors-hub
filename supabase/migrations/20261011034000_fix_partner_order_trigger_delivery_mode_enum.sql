-- Ensure the order synchronization trigger uses the delivery_mode values allowed by orders_delivery_mode_check.
create or replace function private.partner_delivery_mode_for_store(p_store public.partner_stores)
returns text language sql immutable set search_path to ''
as $function$
  select case
    when p_store.delivery_mode in ('own','hybrid') and p_store.own_driver_available then 'own_driver'
    when p_store.delivery_mode in ('third_party','hybrid') then 'third_party'
    else null
  end
$function$;
