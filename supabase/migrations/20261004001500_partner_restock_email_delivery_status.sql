alter table public.partner_restock_orders
  add column if not exists email_status text not null default 'pending'
    check (email_status in ('pending','sent','failed')),
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_error text;
