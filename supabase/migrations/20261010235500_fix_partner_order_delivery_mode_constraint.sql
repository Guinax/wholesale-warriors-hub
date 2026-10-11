-- Align partner checkout with orders_delivery_mode_check.
-- Do not change payment, freight, or partner delivery logic.
do $migration$
declare
  v_definition text;
  v_old text := 'case when r.quote_source=''own_driver'' then ''own'' else ''third_party'' end,r.shipping';
  v_new text := 'case when r.quote_source=''own_driver'' then ''own_driver'' else ''third_party'' end,r.shipping';
begin
  select pg_get_functiondef('private.partner_command(text,jsonb)'::regprocedure) into v_definition;
  if position(v_old in v_definition) = 0 then
    if position(v_new in v_definition) > 0 then return; end if;
    raise exception 'Partner confirm SQL changed; review before patching.';
  end if;
  v_definition := replace(v_definition, v_old, v_new);
  execute v_definition;
end
$migration$;
