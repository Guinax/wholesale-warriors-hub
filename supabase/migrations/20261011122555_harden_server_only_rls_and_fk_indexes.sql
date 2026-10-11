-- Make server-only RLS intent explicit so browser roles remain denied.
create policy web_push_subscriptions_deny_clients
on public.web_push_subscriptions
for all to anon, authenticated
using (false) with check (false);

create policy web_push_outbox_deny_clients
on public.web_push_outbox
for all to anon, authenticated
using (false) with check (false);

create policy courier_whatsapp_otps_deny_clients
on private.courier_whatsapp_otps
for all to anon, authenticated
using (false) with check (false);

create policy melhor_envio_oauth_deny_clients
on private.melhor_envio_oauth
for all to anon, authenticated
using (false) with check (false);

create policy partner_delivery_codes_deny_clients
on private.partner_delivery_codes
for all to anon, authenticated
using (false) with check (false);

create index if not exists courier_wallet_payments_paid_by_idx
  on public.courier_wallet_payments(paid_by);
create index if not exists courier_withdrawal_requests_processed_by_idx
  on public.courier_withdrawal_requests(processed_by);
create index if not exists partner_wallet_payments_paid_by_idx
  on public.partner_wallet_payments(paid_by);
create index if not exists web_push_outbox_recipient_id_idx
  on public.web_push_outbox(recipient_id);
