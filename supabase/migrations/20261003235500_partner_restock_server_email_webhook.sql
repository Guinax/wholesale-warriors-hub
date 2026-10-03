create extension if not exists pg_net with schema extensions;

create table if not exists private.partner_restock_webhook_config (
  singleton boolean primary key default true check (singleton),
  secret text not null,
  created_at timestamptz not null default now()
);

revoke all on private.partner_restock_webhook_config from public, anon, authenticated;

insert into private.partner_restock_webhook_config(singleton,secret)
select true, encode(gen_random_bytes(32),'hex')
where not exists (select 1 from private.partner_restock_webhook_config where singleton=true);

create or replace function private.queue_partner_restock_email()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_secret text;
begin
  select secret into v_secret
  from private.partner_restock_webhook_config
  where singleton=true;

  perform net.http_post(
    url := 'https://svkatjljeyyuobayjqjv.supabase.co/functions/v1/partner-restock-email',
    body := jsonb_build_object('order_id',new.id),
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-restock-secret',v_secret
    ),
    timeout_milliseconds := 8000
  );

  return new;
end;
$$;

drop trigger if exists trg_queue_partner_restock_email on public.partner_restock_orders;
create trigger trg_queue_partner_restock_email
after insert on public.partner_restock_orders
for each row execute function private.queue_partner_restock_email();
