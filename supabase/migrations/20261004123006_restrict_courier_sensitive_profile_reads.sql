drop policy if exists courier_profile_self_select on public.courier_profiles;

create policy courier_profile_self_select
on public.courier_profiles
for select
to authenticated
using (
  user_id = (select auth.uid())
  or coalesce(public.has_role('admin'::public.app_role, (select auth.uid())), false)
);
