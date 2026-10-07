alter table public.courier_profiles
  add column if not exists photo_url text;

comment on column public.courier_profiles.photo_url is
  'Foto pública opcional do perfil do entregador.';

drop policy if exists "Couriers upload own profile media" on storage.objects;
create policy "Couriers upload own profile media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'couriers'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Couriers update own profile media" on storage.objects;
create policy "Couriers update own profile media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'couriers'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'couriers'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Couriers delete own profile media" on storage.objects;
create policy "Couriers delete own profile media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'couriers'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create or replace function public.courier_update_photo(p_photo_url text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  normalized text := nullif(trim(coalesce(p_photo_url, '')), '');
begin
  if u is null then
    raise exception 'Faça login para continuar.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.courier_profiles where user_id = u) then
    raise exception 'Cadastre-se como entregador primeiro.' using errcode = '42501';
  end if;

  if normalized is not null then
    if length(normalized) > 1000
       or normalized !~ '^https://'
       or position('/storage/v1/object/public/media/couriers/' || u::text || '/' in normalized) = 0 then
      raise exception 'Imagem de perfil inválida.';
    end if;
  end if;

  update public.courier_profiles
     set photo_url = normalized,
         updated_at = now()
   where user_id = u;

  return jsonb_build_object('ok', true, 'photo_url', normalized);
end;
$$;

revoke all on function public.courier_update_photo(text) from public;
grant execute on function public.courier_update_photo(text) to authenticated;