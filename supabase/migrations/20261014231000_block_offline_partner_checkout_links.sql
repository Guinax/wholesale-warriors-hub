-- Última verificação: nenhum link de pagamento novo para loja que ficou offline.
-- Pedidos já pagos permanecem intactos e podem ser regularizados pelo atendimento.
do $migration$
declare
  d text;
  old_sql text := 'and o.due_at>now()';
  new_sql text := 'and o.due_at>now()' || chr(10) || '    and private.partner_can_receive_new_orders(o.fulfillment_store_id)';
begin
  d := pg_get_functiondef('private.partner_checkout_valid(uuid)'::regprocedure);
  if strpos(d,old_sql)=0 then
    raise exception 'Validador do link de pagamento não identificado';
  end if;
  if strpos(d,'and private.partner_can_receive_new_orders(o.fulfillment_store_id)')=0 then
    execute replace(d,old_sql,new_sql);
  end if;
end;
$migration$;
