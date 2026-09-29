CREATE TABLE IF NOT EXISTS public.catalog_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title text NOT NULL DEFAULT 'CATÁLOGO VIGENTE',
  subtitle text NOT NULL DEFAULT 'ESTILO CIMED x MAROMBA',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.catalog_settings (id, title, subtitle)
VALUES (1, 'CATÁLOGO VIGENTE', 'ESTILO CIMED x MAROMBA')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.catalog_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalog_settings_public_read ON public.catalog_settings;
CREATE POLICY catalog_settings_public_read
ON public.catalog_settings FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS catalog_settings_admin_insert ON public.catalog_settings;
CREATE POLICY catalog_settings_admin_insert
ON public.catalog_settings FOR INSERT
TO authenticated
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS catalog_settings_admin_update ON public.catalog_settings;
CREATE POLICY catalog_settings_admin_update
ON public.catalog_settings FOR UPDATE
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());
