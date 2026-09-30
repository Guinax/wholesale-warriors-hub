alter table public.partner_stores add column if not exists zip text;
alter table public.partner_stores add column if not exists city text;
alter table public.partner_stores add column if not exists state text;
alter table public.partner_stores drop constraint if exists partner_stores_zip_check;
alter table public.partner_stores add constraint partner_stores_zip_check check (zip is null or zip ~ '^[0-9]{8}$');
alter table public.partner_stores drop constraint if exists partner_stores_state_check;
alter table public.partner_stores add constraint partner_stores_state_check check (state is null or state ~ '^[A-Z]{2}$');

-- partner_command registration now persists the structured CEP/city/UF supplied
-- by the CEP geocoding flow, alongside validated coordinates used for routing.
