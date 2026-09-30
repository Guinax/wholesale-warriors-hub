alter table public.partner_stores drop constraint if exists partner_stores_status_check;
alter table public.partner_stores add constraint partner_stores_status_check
check (status = any (array['pending'::text,'approved'::text,'rejected'::text,'suspended'::text]));