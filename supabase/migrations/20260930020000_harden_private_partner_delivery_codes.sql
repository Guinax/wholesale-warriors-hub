-- Delivery verification codes are private implementation data.
-- Keep them inaccessible to browser/API roles; trusted SECURITY DEFINER
-- routines own the delivery verification flow.
revoke all on schema private from anon;
revoke all on table private.partner_delivery_codes from anon, authenticated;
alter table private.partner_delivery_codes enable row level security;
