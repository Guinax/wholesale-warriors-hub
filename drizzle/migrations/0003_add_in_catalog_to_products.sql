ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS in_catalog boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS catalog_order integer NOT NULL DEFAULT 0;