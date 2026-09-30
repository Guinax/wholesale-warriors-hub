-- Final database hardening: keep privileged signup trigger on an empty search_path
-- and remove the redundant unique index already covered by the table constraint.
alter function public.handle_new_user() set search_path = '';

drop index if exists public.partner_payouts_one_per_request_idx;
