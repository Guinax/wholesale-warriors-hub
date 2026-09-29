do $outer$
declare d text;
begin
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='partner_command';
 d:=replace(d,
 $old$for v in select x->>'name' name,sum((x->>'qty')::integer)::integer qty from jsonb_array_elements(p_payload->'items') x group by x->>'name' loop
   select id,case when v.qty>=6 then wholesale_price else unit_price end into pid,price from public.products where name=v.name and active;
   if not found or price is null or price<=0 or v.qty>100000 then raise exception 'Produto indisponível: %',v.name; end if;
   lines:=lines||jsonb_build_array(jsonb_build_object('product_id',pid,'name',v.name,'qty',v.qty,'unit_price',price,'subtotal',price*v.qty));
   total:=total+price*v.qty;
  end loop;$old$,
 $new$for v in select (x->>'product_id')::uuid product_id,sum((x->>'qty')::integer)::integer qty from jsonb_array_elements(p_payload->'items') x group by (x->>'product_id')::uuid loop
   select id,name,case when v.qty>=6 then wholesale_price else unit_price end into pid,code,price from public.products where id=v.product_id and active;
   if not found or price is null or price<=0 or v.qty>100000 then raise exception 'Produto indisponível.'; end if;
   lines:=lines||jsonb_build_array(jsonb_build_object('product_id',pid,'name',code,'qty',v.qty,'unit_price',price,'subtotal',price*v.qty));
   total:=total+price*v.qty;
  end loop;$new$);
 execute d;
end $outer$;