-- Prepara os cinco sucos de 500 ml comercializados pela Adega Maromba.
-- Preserva os preços já utilizados para a categoria bebidas_naturais.
-- Não altera preços, estoque ou identidade dos produtos antigos.
-- Novos sabores iniciam com estoque zero; imagens SVG individuais já estão no repositório.
WITH reference_price AS (
 SELECT unit_price, wholesale_price
 FROM public.products
 WHERE category = 'bebidas_naturais'
 ORDER BY sort_order, id
 LIMIT 1
), flavors(name, sort_order, image_url) AS (
 VALUES
 ('Suco Adega Maromba Laranja 500 ml', 101, '/produtos/bebidas-naturais/adega-maromba/laranja.svg'),
 ('Suco Adega Maromba Laranja com Acerola 500 ml', 102, '/produtos/bebidas-naturais/adega-maromba/laranja_com_acerola.svg'),
 ('Suco Adega Maromba Maracujá 500 ml', 103, '/produtos/bebidas-naturais/adega-maromba/maracuja.svg'),
 ('Suco Adega Maromba Uva 500 ml', 104, '/produtos/bebidas-naturais/adega-maromba/uva.svg'),
 ('Suco Adega Maromba Abacaxi com Hortelã 500 ml', 105, '/produtos/bebidas-naturais/adega-maromba/abacaxi_com_hortela.svg')
)
INSERT INTO public.products
 (name, category, image_url, unit_price, wholesale_price, min_qty, stock, active, in_catalog, badge, sort_order, catalog_order, weight_kg, width_cm, height_cm, length_cm)
SELECT f.name, 'bebidas_naturais', f.image_url, p.unit_price, p.wholesale_price,
 1, 0, true, true, 'ADEGA MAROMBA', f.sort_order, f.sort_order, 0.53, 6.5, 20.5, 6.5
FROM flavors f CROSS JOIN reference_price p
WHERE NOT EXISTS (SELECT 1 FROM public.products existing WHERE existing.name = f.name AND existing.category = 'bebidas_naturais');
