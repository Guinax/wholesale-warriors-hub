-- OTP seguro para confirmação de WhatsApp dos entregadores.
-- A tabela fica inacessível ao cliente; apenas a Edge Function com service_role usa os registros.

create table if not exists private.courier_whatsapp_otps (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone_e164 text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 10),
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.courier_whatsapp_otps enable row level security;

revoke all on table private.courier_whatsapp_otps from public, anon, authenticated;

create index if not exists courier_whatsapp_otps_expires_at_idx
  on private.courier_whatsapp_otps (expires_at);

comment on table private.courier_whatsapp_otps is
  'Códigos OTP efêmeros para validação de WhatsApp de entregadores. Sem acesso direto do cliente.';
