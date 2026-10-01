-- Seed a mixed female/male fitness clothing catalog without duplicating existing names.
with clothes(category,name,image_url,unit_price,wholesale_price,min_qty,stock,active,in_catalog,badge,sort_order,catalog_order) as (
  values
  ('roupas','Top Fitness Oxer sem Bojo Baixa Sustentação - Feminino','https://imgcentauro-a.akamaihd.net/130x130/9742963WA2.jpg',37.99,37.99,1,0,true,true,'FEMININO',1,33),
  ('roupas','Calça Legging Oxer Campeão Slim - Feminina','https://imgcentauro-a.akamaihd.net/1024x1024/97479417A8.jpg',78.94,78.94,1,0,true,true,'FEMININO',2,34),
  ('roupas','Short Feminino Oxer Básico','https://imgcentauro-a.akamaihd.net/240x240/98485502A8.jpg',53.99,53.99,1,0,true,true,'FEMININO',3,35),
  ('roupas','Short Feminino Oxer Ever com Forro e Bolso','https://imgcentauro-a.akamaihd.net/1024x1024/98185117A2.jpg',53.99,53.99,1,0,true,true,'FEMININO',4,36),
  ('roupas','Camiseta Feminina Oxer Manga Longa Run','https://imgcentauro-a.akamaihd.net/240x240/97860104A11.jpg',59.99,59.99,1,0,true,true,'FEMININO',5,37),
  ('roupas','Camiseta Masculina Oxer Manga Curta Tunin','https://imgcentauro-a.akamaihd.net/240x240/98850617A2.jpg',56.99,56.99,1,0,true,true,'MASCULINO',6,38),
  ('roupas','Camiseta Oxer Estampada - Masculina','https://imgcentauro-a.akamaihd.net/240x240/99668383A2.jpg',42.74,42.74,1,0,true,true,'MASCULINO',7,39),
  ('roupas','Bermuda Masculina Oxer Training 7 Tecido Plano','https://imgcentauro-a.akamaihd.net/240x240/98142902A19.jpg',35.99,35.99,1,0,true,true,'MASCULINO',8,40),
  ('roupas','Camiseta Masculina Oxer Básica Algodão Antiodor','https://imgcentauro-a.akamaihd.net/240x240/988497NMA5.jpg',36.94,36.94,1,0,true,true,'MASCULINO',9,41),
  ('roupas','Camiseta Masculina Oxer Manga Longa Recortada','https://imgcentauro-a.akamaihd.net/1024x1024/98594302A6.jpg',56.99,56.99,1,0,true,true,'MASCULINO',10,42)
)
insert into public.products
(category,name,image_url,unit_price,wholesale_price,min_qty,stock,active,in_catalog,badge,sort_order,catalog_order)
select c.*
from clothes c
where not exists (
  select 1 from public.products p where p.name = c.name
);
