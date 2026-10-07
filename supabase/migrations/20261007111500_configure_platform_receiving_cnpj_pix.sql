-- Active platform receiving account.
-- InfinitePay checkout continues to use provider handle wgsolucoesfinaceira.
-- The PIX receiving key is the company CNPJ and is kept in the private schema.

create schema if not exists private;

create table if not exists private.platform_receiving_account (
  singleton boolean primary key default true check (singleton),
  provider text not null default 'infinitepay',
  provider_handle text not null,
  holder_document_type text not null check (holder_document_type in ('cpf','cnpj')),
  holder_document text not null,
  pix_key_type text not null check (pix_key_type in ('cpf','cnpj','email','phone','random')),
  pix_key text not null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

revoke all on private.platform_receiving_account from public, anon, authenticated;

insert into private.platform_receiving_account (
  singleton,
  provider,
  provider_handle,
  holder_document_type,
  holder_document,
  pix_key_type,
  pix_key,
  active,
  updated_at
) values (
  true,
  'infinitepay',
  'wgsolucoesfinaceira',
  'cnpj',
  '64529434000166',
  'cnpj',
  '64529434000166',
  true,
  now()
)
on conflict (singleton) do update
set provider = excluded.provider,
    provider_handle = excluded.provider_handle,
    holder_document_type = excluded.holder_document_type,
    holder_document = excluded.holder_document,
    pix_key_type = excluded.pix_key_type,
    pix_key = excluded.pix_key,
    active = excluded.active,
    updated_at = now();
