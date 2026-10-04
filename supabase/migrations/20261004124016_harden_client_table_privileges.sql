-- Client roles never need schema-destructive table privileges.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- Public read-only content.
revoke insert, update, delete on table public.bestsellers from anon, authenticated;
revoke insert, update, delete on table public.commission_tiers from anon, authenticated;
revoke insert, update, delete on table public.reviews from anon, authenticated;

-- Partner replenishment is created through controlled RPCs; admin only updates order status.
revoke all on table public.partner_restock_orders from anon;
revoke all on table public.partner_restock_order_items from anon;
revoke insert, delete on table public.partner_restock_orders from authenticated;
revoke insert, update, delete on table public.partner_restock_order_items from authenticated;

-- Courier mutations run through validated RPCs; direct table access is read-only.
revoke insert, update, delete on table public.courier_profiles from authenticated;
revoke insert, update, delete on table public.courier_jobs from authenticated;
revoke insert, update, delete on table public.courier_locations from authenticated;
revoke insert, update, delete on table public.courier_payouts from authenticated;
revoke insert, update, delete on table public.courier_store_links from authenticated;

-- Notifications are read by the owner and only marked read client-side.
revoke insert, delete on table public.user_notifications from authenticated;
