-- Tarifa piloto uniforme para entregas locais da rede Mansão Maromba.
-- Referência operacional inicial (não é tarifa oficial do iFood):
-- R$ 7,50 até 3 km; R$ 1,50 por km adicional.
-- Calculada no servidor, independentemente do parceiro ou tipo de motoboy.
-- Não altera frete da expedição central nem o checkout InfinitePay.
DO $migration$
DECLARE
  definition text;
  previous_expression text := 'round(s.delivery_base+s.delivery_per_km*km+s.delivery_per_kg*kg,2)';
  standard_expression text := 'round((7.50 + greatest(km - 3, 0) * 1.50)::numeric, 2)';
BEGIN
  SELECT pg_get_functiondef(p.oid)
    INTO definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'private'
     AND p.proname = 'partner_command'
     AND pg_get_function_identity_arguments(p.oid) = 'p_action text, p_payload jsonb';

  IF definition IS NULL THEN
    RAISE EXCEPTION 'private.partner_command não encontrada; nenhuma tarifa foi alterada';
  END IF;

  IF strpos(definition, previous_expression) = 0 THEN
    RAISE EXCEPTION 'Expressão de cotação esperada não encontrada; revisão manual necessária';
  END IF;

  definition := replace(definition, previous_expression, standard_expression);
  EXECUTE definition;
END
$migration$;
