-- Transactional outbox prevents push payload generation in the browser.
create table if not exists public.web_push_outbox (
 id bigint generated always as identity primary key,
 kind text not null check (kind in ('courier_job','partner_offer')),
 target_id uuid not null,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 sent_at timestamptz,
 attempts integer not null default 0,
 unique(kind,target_id,recipient_id)
);
alter table public.web_push_outbox enable row level security;
revoke all on public.web_push_outbox from anon, authenticated;
create index if not exists web_push_outbox_pending_idx on public.web_push_outbox(created_at) where sent_at is null;

create or replace function private.queue_partner_offer_push()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.web_push_outbox(kind,target_id,recipient_id)
 select 'partner_offer',new.request_id,s.owner_id
 from public.partner_stores s
 where s.id=new.store_id and s.status='approved' and s.is_open
   and not new.declined and new.available_at<=now()
 on conflict do nothing;
 return new;
end $$;
drop trigger if exists queue_partner_offer_push on public.partner_offers;
create trigger queue_partner_offer_push after insert or update of available_at,declined
on public.partner_offers for each row execute function private.queue_partner_offer_push();

create or replace function private.queue_courier_job_push()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='searching' and new.courier_id is null
   and (tg_op='INSERT' or old.status is distinct from 'searching') then
  insert into public.web_push_outbox(kind,target_id,recipient_id)
  select 'courier_job',new.id,c.user_id from public.courier_profiles c
  where c.status='approved' and c.is_online
  on conflict do nothing;
 end if;
 return new;
end $$;
drop trigger if exists queue_courier_job_push on public.courier_jobs;
create trigger queue_courier_job_push after insert or update of status,courier_id
on public.courier_jobs for each row execute function private.queue_courier_job_push();
