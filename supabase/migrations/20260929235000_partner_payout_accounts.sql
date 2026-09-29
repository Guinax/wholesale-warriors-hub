create table if not exists public.partner_payout_accounts(
 store_id uuid primary key references public.partner_stores(id) on delete cascade,
 pix_key_type text not null check(pix_key_type in ('cpf','cnpj','email','phone','random')),
 pix_key text not null,
 holder_name text not null,
 holder_document text not null,
 updated_at timestamptz not null default now()
);
alter table public.partner_payout_accounts enable row level security;
revoke all on public.partner_payout_accounts from public,anon;
grant select,insert,update on public.partner_payout_accounts to authenticated;
create policy partner_payout_accounts_owner_select on public.partner_payout_accounts for select to authenticated using(exists(select 1 from public.partner_stores s where s.id=store_id and s.owner_id=(select auth.uid())));
create policy partner_payout_accounts_owner_insert on public.partner_payout_accounts for insert to authenticated with check(exists(select 1 from public.partner_stores s where s.id=store_id and s.owner_id=(select auth.uid())));
create policy partner_payout_accounts_owner_update on public.partner_payout_accounts for update to authenticated using(exists(select 1 from public.partner_stores s where s.id=store_id and s.owner_id=(select auth.uid()))) with check(exists(select 1 from public.partner_stores s where s.id=store_id and s.owner_id=(select auth.uid())));
create or replace function private.partner_payout_account_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.pix_key=trim(new.pix_key); new.holder_name=trim(new.holder_name); new.holder_document=regexp_replace(new.holder_document,'[^0-9]','','g'); new.updated_at=now();
 if new.pix_key='' or length(new.holder_name)<3 or length(new.holder_document) not in (11,14) then raise exception 'Dados de repasse inválidos.'; end if;
 return new;
end $$;
revoke all on function private.partner_payout_account_guard() from public,anon,authenticated;
create trigger partner_payout_account_guard_before_write before insert or update on public.partner_payout_accounts for each row execute function private.partner_payout_account_guard();