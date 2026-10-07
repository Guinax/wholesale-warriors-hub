alter table public.partner_payouts
  drop constraint if exists partner_payouts_status_check;

alter table public.partner_payouts
  add constraint partner_payouts_status_check
  check (status in ('pending','eligible','approved','partial','paid','cancelled'));