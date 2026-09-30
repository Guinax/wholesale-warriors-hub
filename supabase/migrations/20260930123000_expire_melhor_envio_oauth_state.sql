create or replace function public.service_melhor_envio_consume_oauth_state(p_state text)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare ok boolean:=false;
begin
  update private.melhor_envio_oauth
  set oauth_state=null,updated_at=now()
  where id=1
    and oauth_state=p_state
    and updated_at >= now() - interval '15 minutes'
  returning true into ok;
  return coalesce(ok,false);
end $$;

revoke all on function public.service_melhor_envio_consume_oauth_state(text) from public,anon,authenticated;
grant execute on function public.service_melhor_envio_consume_oauth_state(text) to service_role;
