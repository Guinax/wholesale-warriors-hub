-- Cadastra a linha Bebidas Naturais Mansão Maromba.
-- Preços definidos em 2026-10-06:
-- varejo R$ 18,90; atacado R$ 14,90 a partir de 6 unidades.
-- Frete permanece calculado separadamente no checkout.
-- Estoque inicia zerado até confirmação da produção física.

with natural_drinks(name, unit_price, wholesale_price, sort_order) as (
  values
    ('Suco Natural Laranja Mansão Maromba 500 ml', 18.90::numeric, 14.90::numeric, 1),
    ('Suco Detox Verde Mansão Maromba 500 ml', 18.90::numeric, 14.90::numeric, 2),
    ('Suco Natural Morango Mansão Maromba 500 ml', 18.90::numeric, 14.90::numeric, 3),
    ('Suco Natural Maracujá Mansão Maromba 500 ml', 18.90::numeric, 14.90::numeric, 4),
    ('Suco Natural Açaí Mansão Maromba 500 ml', 18.90::numeric, 14.90::numeric, 5),
    ('Suco Natural Melancia Mansão Maromba 500 ml', 18.90::numeric, 14.90::numeric, 6)
)
update public.products p
set unit_price=n.unit_price,
    wholesale_price=n.wholesale_price,
    min_qty=1,
    active=true,
    in_catalog=true,
    badge='MANSÃO MAROMBA',
    sort_order=n.sort_order,
    catalog_order=n.sort_order,
    weight_kg=0.53,
    width_cm=6.5,
    height_cm=20.5,
    length_cm=6.5,
    updated_at=now()
from natural_drinks n
where p.category='bebidas_naturais' and p.name=n.name;

with natural_drinks(name, unit_price, wholesale_price, sort_order) as (
  values
    ('Suco Natural Laranja Mansão Maromba 500 ml', 18.90::numeric, 14.90::numeric, 1),
    ('Suco Detox Verde Mansão Maromba 500 ml', 18.90::numeric, 14.90::numeric, 2),
    ('Suco Natural Morango Mansão Maromba 500 ml', 18.90::numeric, 14.90::numeric, 3),
    ('Suco Natural Maracujá Mansão Maromba 500 ml', 18.90::numeric, 14.90::numeric, 4),
    ('Suco Natural Açaí Mansão Maromba 500 ml', 18.90::numeric, 14.90::numeric, 5),
    ('Suco Natural Melancia Mansão Maromba 500 ml', 18.90::numeric, 14.90::numeric, 6)
)
insert into public.products
  (name, category, unit_price, wholesale_price, min_qty, stock, active, in_catalog, badge, sort_order, catalog_order, weight_kg, width_cm, height_cm, length_cm)
select
  n.name, 'bebidas_naturais', n.unit_price, n.wholesale_price, 1, 0, true, true, 'MANSÃO MAROMBA', n.sort_order, n.sort_order, 0.53, 6.5, 20.5, 6.5
from natural_drinks n
where not exists (
  select 1
  from public.products p
  where p.category='bebidas_naturais' and p.name=n.name
);
