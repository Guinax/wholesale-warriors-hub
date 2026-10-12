-- Natural juices are sold individually. Retail remains unit-by-unit through 9 units;
-- wholesale pricing starts only at 10 total juice units in the cart.
update public.products
set min_qty = 10
where category = 'bebidas_naturais'
   or name ilike 'Suco Natural%';
