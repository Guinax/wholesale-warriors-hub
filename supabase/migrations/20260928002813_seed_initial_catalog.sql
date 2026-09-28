-- Catálogo inicial do projeto. Estoque começa zerado até confirmação no painel.
WITH initial_catalog(category, name, unit_price, wholesale_price, min_qty, badge, badge_color, sort_order) AS (
  VALUES
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
('equipamento','CORDA NAVAL 12M',499,279,1,NULL,NULL,6)
)
INSERT INTO public.products
  (category, name, unit_price, wholesale_price, min_qty, badge, badge_color, sort_order, catalog_order, stock)
SELECT category, name, unit_price, wholesale_price, min_qty, badge, badge_color, sort_order, sort_order, 0
FROM initial_catalog seed
WHERE NOT EXISTS (
  SELECT 1 FROM public.products existing
  WHERE existing.category = seed.category AND existing.name = seed.name
);
