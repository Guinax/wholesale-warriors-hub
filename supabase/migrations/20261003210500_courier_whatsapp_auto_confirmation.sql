-- Confirmação automática de cadastro de entregadores via WhatsApp MFA.
-- O código é verificado pelo Supabase Auth; esta função apenas aprova o perfil
-- quando existe um fator de telefone verificado para o mesmo usuário/número.

alter table public.courier_profiles
  add column if not exists phone_verified_at timestamptz;

create or replace function private.courier_confirm_whatsapp()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  u uuid := auth.uid();
  c public.courier_profiles;
  verified_phone text;
  was_approved boolean := false;
begin
  if u is null then
    raise exception 'Faça login para continuar.' using errcode='42501';
  end if;

  select * into c
  from public.courier_profiles
  where user_id=u
  for update;

  if not found then
    raise exception 'Cadastre-se como entregador primeiro.';
  end if;

  if c.status='suspended' then
    raise exception 'Cadastro suspenso. Fale com o suporte.';
  end if;

  if length(coalesce(c.cpf,''))<>11 then
    raise exception 'CPF obrigatório antes da confirmação.';
  end if;

  if c.vehicle_type<>'bike' then
    if length(coalesce(c.cnh_number,''))<>11
       or coalesce(c.cnh_category,'')=''
       or c.cnh_expiry is null
       or coalesce(c.vehicle_plate,'')='' then
      raise exception 'Complete CNH e dados do veículo antes da confirmação.';
    end if;
  end if;

  select f.phone into verified_phone
  from auth.mfa_factors f
  where f.user_id=u
    and f.factor_type::text='phone'
    and f.status::text='verified'
    and right(regexp_replace(coalesce(f.phone,''),'\D','','g'),11)
        = right(regexp_replace(coalesce(c.phone,''),'\D','','g'),11)
  order by f.updated_at desc
  limit 1;

  if verified_phone is null then
    raise exception 'Confirme o código enviado pelo WhatsApp antes de concluir o cadastro.';
  end if;

  was_approved := c.status='approved';

  update public.courier_profiles
  set status='approved',
      phone_verified_at=now(),
      updated_at=now()
  where id=c.id
  returning * into c;

  if not was_approved then
    insert into public.user_notifications(user_id,title,message,type,action_path)
    values(
      c.user_id,
      'Cadastro confirmado',
      'Seu número foi confirmado pelo WhatsApp. Seu cadastro de entregador está aprovado e você já pode ficar online.',
      'courier_approved',
      '/motoqueiro'
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'status',c.status,
    'phone_verified_at',c.phone_verified_at
  );
end
$function$;

create or replace function public.courier_confirm_whatsapp()
returns jsonb
language sql
security definer
set search_path to ''
as $function$
  select private.courier_confirm_whatsapp();
$function$;

revoke all on function private.courier_confirm_whatsapp() from public,anon,authenticated;
revoke all on function public.courier_confirm_whatsapp() from public,anon;
grant execute on function public.courier_confirm_whatsapp() to authenticated;
