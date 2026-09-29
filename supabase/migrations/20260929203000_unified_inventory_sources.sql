-- Unified multi-source inventory for Mansao Maromba
CREATE TABLE IF NOT EXISTS public.inventory_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('warehouse','supplier','seller')),
  contact_name text, phone text, city text, state text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.inventory_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.inventory_sources(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0 AND reserved <= quantity),
  reorder_point integer NOT NULL DEFAULT 5 CHECK (reorder_point >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, product_id)
);
ALTER TABLE public.inventory_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_balances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventory_sources, public.inventory_balances FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_sources, public.inventory_balances TO authenticated;
DROP POLICY IF EXISTS inventory_sources_admin_all ON public.inventory_sources;
CREATE POLICY inventory_sources_admin_all ON public.inventory_sources FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
DROP POLICY IF EXISTS inventory_balances_admin_all ON public.inventory_balances;
CREATE POLICY inventory_balances_admin_all ON public.inventory_balances FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE OR REPLACE FUNCTION public.inventory_balance_sync_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE target_product_id uuid;
BEGIN
 target_product_id := CASE WHEN TG_OP='DELETE' THEN OLD.product_id ELSE NEW.product_id END;
 UPDATE public.products p SET stock=(SELECT COALESCE(SUM(b.quantity-b.reserved),0)::integer FROM public.inventory_balances b WHERE b.product_id=target_product_id), updated_at=now() WHERE p.id=target_product_id;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END; $$;
REVOKE ALL ON FUNCTION public.inventory_balance_sync_trigger() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS inventory_balances_sync_product ON public.inventory_balances;
CREATE TRIGGER inventory_balances_sync_product AFTER INSERT OR UPDATE OR DELETE ON public.inventory_balances FOR EACH ROW EXECUTE FUNCTION public.inventory_balance_sync_trigger();

CREATE INDEX IF NOT EXISTS inventory_balances_product_idx ON public.inventory_balances(product_id);
CREATE INDEX IF NOT EXISTS inventory_balances_source_idx ON public.inventory_balances(source_id);

-- Preserve all pre-migration stock as the initial central warehouse balance.
WITH src AS (
 INSERT INTO public.inventory_sources(name,source_type,city,state)
 SELECT 'Estoque Central','warehouse','Iracemápolis','SP'
 WHERE NOT EXISTS (SELECT 1 FROM public.inventory_sources WHERE name='Estoque Central' AND source_type='warehouse')
 RETURNING id
), central AS (
 SELECT id FROM src UNION ALL SELECT id FROM public.inventory_sources WHERE name='Estoque Central' AND source_type='warehouse' LIMIT 1
)
INSERT INTO public.inventory_balances(source_id,product_id,quantity,reserved,reorder_point)
SELECT central.id,p.id,GREATEST(p.stock,0),0,5 FROM public.products p CROSS JOIN central
ON CONFLICT(source_id,product_id) DO NOTHING;
