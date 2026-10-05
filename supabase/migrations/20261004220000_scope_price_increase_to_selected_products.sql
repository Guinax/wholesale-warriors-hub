-- Correct the previous broad R$ 10 increase so it applies only to the products
-- represented by the newly approved promotional artwork.
--
-- The previous migration increased every active product. On a clean replay this
-- migration restores all non-target products and pins the approved target prices.

with target_names(name) as (
  values
    ('Growth Blend Vegan 1kg - Chocolate'),
    ('Pré-Treino URSO Ataque 300g - Frutas Amarelas'),
    ('Whey Protein URSO 3W 1kg - Leite em Pó'),
    ('Shot Energético URSO Café/Mocha - Caixa 12x60ml'),
    ('Creatina URSO 100% Monohidratada 250g - Sem Sabor'),
    ('Gin Limão Siciliano Cravo e Canela Mansão Maromba 750mL'),
    ('Gin Morango com Hibisco Mansão Maromba 750mL'),
    ('Gin Tropical Mansão Maromba 750mL'),
    ('Gin Pitaya Mansão Maromba 750mL'),
    ('Gin Maçã Verde Mansão Maromba 750mL'),
    ('Gin Melancia Mansão Maromba 750mL')
)
update public.products p
set
  unit_price = greatest(p.unit_price - 10.00, 0),
  wholesale_price = greatest(p.wholesale_price - 10.00, 0)
where p.active = true
  and not exists (select 1 from target_names t where t.name = p.name);

update public.products
set
  unit_price = case name
    when 'Growth Blend Vegan 1kg - Chocolate' then 138.15
    when 'Pré-Treino URSO Ataque 300g - Frutas Amarelas' then 84.90
    when 'Whey Protein URSO 3W 1kg - Leite em Pó' then 289.90
    when 'Shot Energético URSO Café/Mocha - Caixa 12x60ml' then 69.90
    when 'Creatina URSO 100% Monohidratada 250g - Sem Sabor' then 55.90
    when 'Gin Limão Siciliano Cravo e Canela Mansão Maromba 750mL' then 36.90
    when 'Gin Morango com Hibisco Mansão Maromba 750mL' then 36.90
    when 'Gin Tropical Mansão Maromba 750mL' then 36.90
    when 'Gin Pitaya Mansão Maromba 750mL' then 36.90
    when 'Gin Maçã Verde Mansão Maromba 750mL' then 36.90
    when 'Gin Melancia Mansão Maromba 750mL' then 36.90
    else unit_price
  end,
  wholesale_price = case name
    when 'Growth Blend Vegan 1kg - Chocolate' then 138.15
    when 'Pré-Treino URSO Ataque 300g - Frutas Amarelas' then 84.90
    when 'Whey Protein URSO 3W 1kg - Leite em Pó' then 289.90
    when 'Shot Energético URSO Café/Mocha - Caixa 12x60ml' then 69.90
    when 'Creatina URSO 100% Monohidratada 250g - Sem Sabor' then 55.90
    when 'Gin Limão Siciliano Cravo e Canela Mansão Maromba 750mL' then 32.99
    when 'Gin Morango com Hibisco Mansão Maromba 750mL' then 32.99
    when 'Gin Tropical Mansão Maromba 750mL' then 32.99
    when 'Gin Pitaya Mansão Maromba 750mL' then 32.99
    when 'Gin Maçã Verde Mansão Maromba 750mL' then 32.99
    when 'Gin Melancia Mansão Maromba 750mL' then 32.99
    else wholesale_price
  end
where name in (
  'Growth Blend Vegan 1kg - Chocolate',
  'Pré-Treino URSO Ataque 300g - Frutas Amarelas',
  'Whey Protein URSO 3W 1kg - Leite em Pó',
  'Shot Energético URSO Café/Mocha - Caixa 12x60ml',
  'Creatina URSO 100% Monohidratada 250g - Sem Sabor',
  'Gin Limão Siciliano Cravo e Canela Mansão Maromba 750mL',
  'Gin Morango com Hibisco Mansão Maromba 750mL',
  'Gin Tropical Mansão Maromba 750mL',
  'Gin Pitaya Mansão Maromba 750mL',
  'Gin Maçã Verde Mansão Maromba 750mL',
  'Gin Melancia Mansão Maromba 750mL'
);