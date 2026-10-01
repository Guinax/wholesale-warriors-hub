-- Seed the initial supplements catalog without duplicating existing names.
with supplements(category, name, image_url, unit_price, wholesale_price, min_qty, stock, active, in_catalog, badge, sort_order, catalog_order, weight_kg) as (
  values
  ('suplementos','Whey Protein URSO 3W 1kg - Leite em Pó','https://www.ursocimed.com.br/cdn/shop/files/POUCHPILOTO_final_LEITEEMPO.png?v=1788381509&width=1600',279.90,279.90,1,0,true,true,'URSO • CIMED',1,23,1.00),
  ('suplementos','Creatina URSO 100% Monohidratada 250g - Sem Sabor','https://www.ursocimed.com.br/cdn/shop/files/CREATINA_PURA_1_DSC07319_SEM_FUNDO.png?v=1787687023&width=1600',45.90,45.90,1,0,true,true,'URSO • CIMED',2,24,0.25),
  ('suplementos','Pré-Treino URSO Ataque 300g - Frutas Amarelas','https://www.ursocimed.com.br/cdn/shop/files/ATAQUE_PRE_TREINO_TROPICAL_1_DSC07361_SEM_FUNDO.png?v=1786737415&width=1000',74.90,74.90,1,0,true,true,'URSO • CIMED',3,25,0.30),
  ('suplementos','Shot Energético URSO Café/Mocha - Caixa 12x60ml','https://www.ursocimed.com.br/cdn/shop/files/URSO_SHOT_DISPLAY_SEM_FUNDO.png?v=1787000886&width=1600',59.90,59.90,1,0,true,true,'URSO • CIMED',4,26,null),
  ('suplementos','Growth 100% Whey Concentrado 900g - Chocolate','https://www.gsuplementos.com.br/upload/produto/imagem/100-whey-protein-concentrado-chocolate-4074.jpg',169.90,169.90,1,0,true,true,'GROWTH',5,27,0.90),
  ('suplementos','Growth Whey Protein Isolado 1kg - Natural','https://http2.mlstatic.com/D_Q_NP_2X_605549-MLA99468028240_112025-P.webp',399.90,399.90,1,0,true,true,'GROWTH',6,28,1.00),
  ('suplementos','Growth Medium Whey Protein 1kg - Chocolate','https://www.gsuplementos.com.br/upload/produto/imagem/medium-whey-protein-1kg-growth-supplements.jpg',129.90,129.90,1,0,true,true,'GROWTH',7,29,1.00),
  ('suplementos','Growth BCAA 2:1:1 - 120 Cápsulas','https://down-br.img.susercontent.com/file/sg-11134201-7ra34-mbcs2mbm60cxee',46.90,46.90,1,0,true,true,'GROWTH',8,30,null),
  ('suplementos','Growth Ômega 3 Ultra 1100 - 75 Softgel','https://http2.mlstatic.com/D_668160-MLA103883306237_012026-C.jpg',78.90,78.90,1,0,true,true,'GROWTH',9,31,null),
  ('suplementos','Growth Blend Vegan 1kg - Chocolate','https://http2.mlstatic.com/D_Q_NP_2X_721471-MLA106460762490_022026-V.jpeg',128.15,128.15,1,0,true,true,'GROWTH',10,32,1.00)
)
insert into public.products
(category, name, image_url, unit_price, wholesale_price, min_qty, stock, active, in_catalog, badge, sort_order, catalog_order, weight_kg)
select s.*
from supplements s
where not exists (
  select 1 from public.products p where p.name = s.name
);
