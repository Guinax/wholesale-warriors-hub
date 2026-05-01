-- Remove a policy pública que expõe toda a tabela orders
DROP POLICY IF EXISTS "Public can read orders by code" ON public.orders;

-- Função SECURITY DEFINER: retorna apenas o pedido cujo order_code foi informado
CREATE OR REPLACE FUNCTION public.get_order_by_code(_order_code text)
RETURNS SETOF public.orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.orders WHERE order_code = _order_code LIMIT 1;
$$;

-- Permite que visitantes (anon) e usuários logados chamem a função
GRANT EXECUTE ON FUNCTION public.get_order_by_code(text) TO anon, authenticated;