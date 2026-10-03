-- Adiciona camiseta Mansão Maromba à categoria Roupas.
-- Referência consultada em 2026-10-03: IdealFit Camisetas.
-- Estoque inicia zerado até confirmação física.

insert into public.products (
  name,
  category,
  image_url,
  unit_price,
  wholesale_price,
  min_qty,
  stock,
  active,
  in_catalog,
  badge,
  catalog_order,
  sort_order,
  weight_kg
)
select
  'Camiseta Dry Fit Masculina Mansão Maromba Preto',
  'roupas',
  'https://images.tcdn.com.br/img/img_prod/1331241/camiseta_dry_fit_masculina_mansao_maromba_preta_149_1_c84dace8bcf33e99cabf6f91002cc497.jpg',
  39.90,
  39.90,
  1,
  0,
  true,
  true,
  'MANSÃO MAROMBA',
  coalesce((select max(catalog_order) from public.products where category='roupas'),0)+1,
  coalesce((select max(sort_order) from public.products where category='roupas'),0)+1,
  0.25
where not exists (
  select 1
  from public.products
  where category='roupas'
    and name='Camiseta Dry Fit Masculina Mansão Maromba Preto'
);
