alter function public.has_role(public.app_role, uuid) security invoker;
alter function public.courier_command(text, jsonb) security invoker;
alter function public.courier_confirm_whatsapp() security invoker;
alter function public.partner_courier_command(text, jsonb) security invoker;
alter function public.partner_link_courier_by_code(uuid, text) security invoker;

grant usage on schema private to authenticated;
grant execute on function private.courier_command(text, jsonb) to authenticated;
grant execute on function private.courier_confirm_whatsapp() to authenticated;
grant execute on function private.partner_courier_command(text, jsonb) to authenticated;
grant execute on function private.partner_link_courier_by_code(uuid, text) to authenticated;
