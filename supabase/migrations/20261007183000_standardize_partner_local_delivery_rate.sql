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
  quantity_anchor text := 'if exists(select 1 from jsonb_array_elements(p_payload->''items'') x where coalesce(x->>''qty'','''') !~ ''^[1-9][0-9]{0,5}$'') then raise exception ''Quantidade inválida.''; end if;';
  quantity_guard text := 'if (select sum((x->>''qty'')::integer) from jsonb_array_elements(p_payload->''items'') x) > 6 then raise exception ''Pedidos acima de 6 unidades são atendidos diretamente pela central da Mansão Maromba.''; end if;';
  changed boolean := false;
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

  -- Idempotente: suporta tanto bancos novos quanto bases já atualizadas.
  IF strpos(definition, standard_expression) = 0 THEN
    IF strpos(definition, previous_expression) = 0 THEN
      RAISE EXCEPTION 'Expressão de cotação esperada não encontrada; revisão manual necessária';
    END IF;
    definition := replace(definition, previous_expression, standard_expression);
    changed := true;
  END IF;

  IF strpos(definition, quantity_guard) = 0 THEN
    IF strpos(definition, quantity_anchor) = 0 THEN
      RAISE EXCEPTION 'Validação de quantidade esperada não encontrada; revisão manual necessária';
    END IF;
    definition := replace(definition, quantity_anchor, quantity_anchor || E'\n  ' || quantity_guard);
    changed := true;
  END IF;

  IF changed THEN
    EXECUTE definition;
  ELSE
    RAISE NOTICE 'Tarifa e limite de 6 unidades já aplicados; nenhuma alteração necessária';
  END IF;
END
$migration$;
