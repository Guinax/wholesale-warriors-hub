-- Adiciona o capacete Mansão Maromba à categoria Acessórios.
-- Preço final de referência pesquisado em 2026-10-03. Estoque inicia zerado até confirmação física.

insert into public.products (
  category,
  name,
  image_url,
  unit_price,
  wholesale_price,
  min_qty,
  stock,
  active,
  in_catalog,
  badge,
  sort_order,
  catalog_order,
  weight_kg
)
values (
  'acessorios',
  'Capacete Moto FW3 GTX Mansão Maromba - Preto Fosco/Grafite',
  'https://cdn.awsli.com.br/2500x2500/2507/2507782/produto/401573381/908f5bffc6ab9f14faa3856a98af2d1a-bx87b8xik1.jpg',
  549.00,
  549.00,
  1,
  0,
  true,
  true,
  'MANSÃO MAROMBA',
  7,
  39,
  1.50
)
on conflict do nothing;
