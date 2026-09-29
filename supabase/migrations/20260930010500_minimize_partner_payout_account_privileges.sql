revoke all on public.partner_payout_accounts from authenticated;
grant select,insert,update on public.partner_payout_accounts to authenticated;

drop policy if exists partner_payout_accounts_owner_select on public.partner_payout_accounts;
create policy partner_payout_accounts_read on public.partner_payout_accounts
for select to authenticated
using (
 exists(select 1 from public.partner_stores s where s.id=store_id and s.owner_id=(select auth.uid()))
 or public.has_role('admin',(select auth.uid()))
);