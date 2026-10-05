-- Increase every product currently listed in the storefront by R$ 10.00.
-- The storefront loads active products from public.products.
-- Apply the same increase to unit and wholesale prices so both displayed price tiers stay aligned.
update public.products
set
  unit_price = unit_price + 10.00,
  wholesale_price = wholesale_price + 10.00
where active = true;
