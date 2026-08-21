ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS address_zip text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    user_id, email, full_name, phone, cpf, cnpj,
    address_street, address_number, address_complement,
    address_city, address_state, address_zip
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'cpf',
    NEW.raw_user_meta_data->>'cnpj',
    NEW.raw_user_meta_data->>'address_street',
    NEW.raw_user_meta_data->>'address_number',
    NEW.raw_user_meta_data->>'address_complement',
    NEW.raw_user_meta_data->>'address_city',
    NEW.raw_user_meta_data->>'address_state',
    NEW.raw_user_meta_data->>'address_zip'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;