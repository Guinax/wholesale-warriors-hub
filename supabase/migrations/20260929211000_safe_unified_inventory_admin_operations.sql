-- Keep repository migration history aligned with production.
CREATE OR REPLACE FUNCTION public.admin_set_inventory_balance(_source_id uuid,_product_id uuid,_quantity integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE current_reserved integer; BEGIN IF NOT private.is_admin() THEN RAISE EXCEPTION 'admin required'; END IF; IF _quantity<0 THEN RAISE EXCEPTION 'quantity must be non-negative'; END IF;
SELECT reserved INTO current_reserved FROM public.inventory_balances WHERE source_id=_source_id AND product_id=_product_id FOR UPDATE;
IF FOUND THEN IF _quantity<current_reserved THEN RAISE EXCEPTION 'quantity cannot be lower than reserved stock'; END IF; UPDATE public.inventory_balances SET quantity=_quantity,updated_at=now() WHERE source_id=_source_id AND product_id=_product_id;
ELSE INSERT INTO public.inventory_balances(source_id,product_id,quantity,reserved,reorder_point) VALUES(_source_id,_product_id,_quantity,0,5); END IF; RETURN _quantity; END; $$;
REVOKE ALL ON FUNCTION public.admin_set_inventory_balance(uuid,uuid,integer) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.admin_set_inventory_balance(uuid,uuid,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_adjust_central_stock(_product_id uuid,_delta integer) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sid uuid;q integer;r integer;nextq integer; BEGIN IF NOT private.is_admin() THEN RAISE EXCEPTION 'admin required'; END IF;
SELECT id INTO sid FROM public.inventory_sources WHERE name='Estoque Central' AND source_type='warehouse' AND active=true ORDER BY created_at LIMIT 1; IF sid IS NULL THEN RAISE EXCEPTION 'central inventory source not found'; END IF;
SELECT quantity,reserved INTO q,r FROM public.inventory_balances WHERE source_id=sid AND product_id=_product_id FOR UPDATE;
IF NOT FOUND THEN q:=0;r:=0;INSERT INTO public.inventory_balances(source_id,product_id,quantity,reserved,reorder_point) VALUES(sid,_product_id,0,0,5);END IF;
nextq:=q+_delta;IF nextq<r OR nextq<0 THEN RAISE EXCEPTION 'insufficient unreserved stock';END IF;UPDATE public.inventory_balances SET quantity=nextq,updated_at=now() WHERE source_id=sid AND product_id=_product_id;RETURN nextq-r;END; $$;
REVOKE ALL ON FUNCTION public.admin_adjust_central_stock(uuid,integer) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.admin_adjust_central_stock(uuid,integer) TO authenticated;
CREATE INDEX IF NOT EXISTS partner_audit_actor_id_idx ON public.partner_audit(actor_id);CREATE INDEX IF NOT EXISTS partner_payouts_approved_by_idx ON public.partner_payouts(approved_by);CREATE INDEX IF NOT EXISTS partner_payouts_paid_by_idx ON public.partner_payouts(paid_by);CREATE INDEX IF NOT EXISTS partner_stock_movements_actor_id_idx ON public.partner_stock_movements(actor_id);