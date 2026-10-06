-- Apply market-based launch pricing for Mansão Maromba beverages.
-- Rule: retail/app price for 1-5 units, wholesale price automatically applies from 6 units.
-- Prices are launch targets derived from the pricing model approved on 2026-10-06.
-- This migration only updates known Mansão Maromba beverage SKUs; unmatched rows are left untouched.

with pricing(name, unit_price, wholesale_price) as (
  values
    ('Whisky + Combo Mansão Maromba 1L', 22.90::numeric, 17.90::numeric),
    ('Whisky + Combo Job Mansão Maromba 1L', 22.90, 17.90),
    ('Vodka + Combo Mansão Maromba 1L', 22.90, 17.90),
    ('Gin + Combo Melancia Mansão Maromba 1L', 23.90, 17.90),
    ('Whisky + Combo Double Darkness Mansão Maromba 1L', 22.90, 17.90),
    ('Whisky + Combo Maçã Verde Mansão Maromba 1L', 22.90, 17.90),
    ('Gin + Combo Tigrinho Tropical Mansão Maromba 1L', 21.90, 16.90),
    ('Whisky + Combo Tigrinho Mansão Maromba 1L', 21.90, 16.90),
    ('Whisky + Combo CLT Mansão Maromba 1L', 21.90, 16.90),
    ('Whisky + Combo Banana Mansão Maromba 1L', 21.90, 16.90),

    ('Gin Melancia Mansão Maromba 750mL', 29.90, 22.90),
    ('Gin Maçã Verde Mansão Maromba 750mL', 29.90, 22.90),
    ('Gin Pitaya Mansão Maromba 750mL', 29.90, 22.90),
    ('Gin Tropical Mansão Maromba 750mL', 29.90, 22.90),
    ('Gin Blueberry Mansão Maromba 750mL', 29.90, 22.90),
    ('Gin Morango com Hibisco Mansão Maromba 750mL', 29.90, 22.90),
    ('Gin Limão Siciliano Cravo e Canela Mansão Maromba 750mL', 29.90, 22.90),
    ('Gin Laranja com Maracujá Mansão Maromba 750mL', 29.90, 22.90),
    ('Gin Frutas Vermelhas Mansão Maromba 750mL', 29.90, 22.90),

    ('Cocktail Whisky Mansão Maromba 750mL', 39.90, 31.90),
    ('Cocktail Gin Mansão Maromba 750mL', 39.90, 31.90),
    ('Cocktail Vodka Mansão Maromba 750mL', 36.90, 28.90),

    ('Sabor Energético Mansão Maromba Original 1L', 14.90, 10.90),
    ('Sabor Energético Mansão Maromba Original Zero 1L', 14.90, 10.90)
)
update public.products p
set
  unit_price = pricing.unit_price,
  wholesale_price = pricing.wholesale_price,
  min_qty = 1
from pricing
where lower(trim(p.name)) = lower(trim(pricing.name));

-- Backward-compatible aliases already seen in earlier catalog versions.
update public.products
set unit_price = 29.90, wholesale_price = 22.90, min_qty = 1
where name in (
  'Gin Limão Siciliano Cravo e Canela Mansão Maromba 750mL',
  'Gin Morango com Hibisco Mansão Maromba 750mL',
  'Gin Tropical Mansão Maromba 750mL',
  'Gin Pitaya Mansão Maromba 750mL',
  'Gin Maçã Verde Mansão Maromba 750mL',
  'Gin Melancia Mansão Maromba 750mL'
);

-- Keep the sales rule explicit: products remain purchasable from one unit;
-- checkout/product pages already switch to wholesale_price at quantity >= 6.
