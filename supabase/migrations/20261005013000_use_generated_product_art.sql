update public.products
set image_url = case name
  when 'Creatina URSO 100% Monohidratada 250g - Sem Sabor' then '/product-art/creatina_urso.jpg'
  when 'Gin Limão Siciliano Cravo e Canela Mansão Maromba 750mL' then '/product-art/gin_limao_siciliano.jpg'
  when 'Gin Maçã Verde Mansão Maromba 750mL' then '/product-art/gin_maca_verde.jpg'
  when 'Gin Melancia Mansão Maromba 750mL' then '/product-art/gin_melancia.jpg'
  when 'Gin Morango com Hibisco Mansão Maromba 750mL' then '/product-art/gin_morango_hibisco.jpg'
  when 'Gin Pitaya Mansão Maromba 750mL' then '/product-art/gin_pitaya.jpg'
  when 'Gin Tropical Mansão Maromba 750mL' then '/product-art/gin_tropical.jpg'
  when 'Growth Blend Vegan 1kg - Chocolate' then '/product-art/growth_blend_vegan.jpg'
  when 'Pré-Treino URSO Ataque 300g - Frutas Amarelas' then '/product-art/pre_treino_urso_ataque.jpg'
  when 'Shot Energético URSO Café/Mocha - Caixa 12x60ml' then '/product-art/shot_urso_cafe_mocha.jpg'
  when 'Whey Protein URSO 3W 1kg - Leite em Pó' then '/product-art/whey_urso_3w.jpg'
  else image_url
end
where name in (
  'Creatina URSO 100% Monohidratada 250g - Sem Sabor',
  'Gin Limão Siciliano Cravo e Canela Mansão Maromba 750mL',
  'Gin Maçã Verde Mansão Maromba 750mL',
  'Gin Melancia Mansão Maromba 750mL',
  'Gin Morango com Hibisco Mansão Maromba 750mL',
  'Gin Pitaya Mansão Maromba 750mL',
  'Gin Tropical Mansão Maromba 750mL',
  'Growth Blend Vegan 1kg - Chocolate',
  'Pré-Treino URSO Ataque 300g - Frutas Amarelas',
  'Shot Energético URSO Café/Mocha - Caixa 12x60ml',
  'Whey Protein URSO 3W 1kg - Leite em Pó'
);