-- Auto-confirm reseller/CNPJ signups while leaving customer signups unchanged.
create or replace function public.confirm_reseller_email_on_signup()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ? 'reseller_registration'
     and nullif(trim(coalesce(new.raw_user_meta_data->>'cnpj', '')), '') is not null then
    new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  end if;
  return new;
end;
$$;

revoke all on function public.confirm_reseller_email_on_signup() from public;

drop trigger if exists confirm_reseller_email_before_insert on auth.users;

create trigger confirm_reseller_email_before_insert
before insert on auth.users
for each row
execute function public.confirm_reseller_email_on_signup();
