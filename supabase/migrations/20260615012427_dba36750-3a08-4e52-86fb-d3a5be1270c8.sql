CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('suplementos','roupas','acessorios','equipamento')),
  name text NOT NULL,
  unit_price numeric NOT NULL,
  wholesale_price numeric NOT NULL,
  min_qty integer NOT NULL DEFAULT 1,
  image_url text,
  badge text,
  badge_color text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active products" ON public.products
  FOR SELECT USING (active = true);

CREATE POLICY "Admins can view all products" ON public.products
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products" ON public.products
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with current hardcoded products
INSERT INTO public.products (category, name, unit_price, wholesale_price, min_qty, badge, badge_color, sort_order) VALUES
('suplementos','MONSTER WHEY 2KG',249,145,1,'CIMED EDITION',NULL,1),
('suplementos','I WANT YOU THERMOGÊNICO',89,49,1,'LANÇAMENTO','bg-success',2),
('suplementos','CREATINE PURE 500G',120,65,1,NULL,NULL,3),
('suplementos','PRE-WORKOUT VOLTAGE',189,98,1,NULL,NULL,4),
('suplementos','BCAA 2:1:1 - 300G',99,54,1,NULL,NULL,5),
('suplementos','GLUTAMINA 300G',109,59,1,NULL,NULL,6),
('roupas','OVERSIZED "NO PAIN"',139,72,1,NULL,NULL,1),
('roupas','REGATA MAROMBA DRY-FIT',99,49,1,NULL,NULL,2),
('roupas','SHORT TACTEL FAMÍLIA',119,62,1,NULL,NULL,3),
('roupas','MOLETOM STREET HEAVY',239,129,1,NULL,NULL,4),
('roupas','BONÉ TRUCKER MAROMBA',79,39,1,NULL,NULL,5),
('roupas','LEGGING POWER PRO',149,79,1,NULL,NULL,6),
('acessorios','COQUETELEIRA SHAKER 700ML',49,22,1,NULL,NULL,1),
('acessorios','STRAP DE PUNHO PAR',59,29,1,NULL,NULL,2),
('acessorios','CINTO DE LEVANTAMENTO',199,109,1,NULL,NULL,3),
('acessorios','LUVA TREINO MAROMBA',89,45,1,NULL,NULL,4),
('acessorios','JOELHEIRA POWER LIFT',159,79,1,NULL,NULL,5),
('acessorios','GARRAFA TÉRMICA 1L',89,42,1,NULL,NULL,6),
('equipamento','KIT HALTERES AJUSTÁVEIS 20KG',899,549,1,NULL,NULL,1),
('equipamento','BARRA OLÍMPICA 1.80M',699,429,1,NULL,NULL,2),
('equipamento','ANILHAS EMBORRACHADAS 10KG (PAR)',349,189,1,NULL,NULL,3),
('equipamento','BANCO SUPINO REGULÁVEL',1299,789,1,NULL,NULL,4),
('equipamento','ELÁSTICO MINI BAND KIT',89,42,1,NULL,NULL,5),
('equipamento','CORDA NAVAL 12M',499,279,1,NULL,NULL,6);