revoke update on public.partner_stores from authenticated;
drop policy if exists partner_stores_owner_delivery_update on public.partner_stores;

-- Partner changes remain available only through validated RPCs:
-- public.partner_command(text,jsonb)
-- public.partner_set_delivery_availability(uuid,text,boolean)
