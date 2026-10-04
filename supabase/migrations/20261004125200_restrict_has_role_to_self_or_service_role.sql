create or replace function public.has_role(_role public.app_role, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      _user_id = (select auth.uid())
      or (select auth.role()) = 'service_role'
    )
    and exists (
      select 1
      from public.user_roles
      where user_id = _user_id
        and role = _role
    );
$$;

revoke all on function public.has_role(public.app_role, uuid) from public, anon;
grant execute on function public.has_role(public.app_role, uuid) to authenticated, service_role;
