-- Alert admins when a product reaches low stock.
-- Threshold requested by the store: 6 units.
create or replace function private.notify_admins_low_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.stock <= 6
     and (
       tg_op = 'INSERT'
       or old.stock is null
       or old.stock > 6
     ) then
    insert into public.user_notifications(user_id,title,message,type,action_path)
    select ur.user_id,
           'Estoque baixo',
           new.name || ' chegou a ' || new.stock || ' unidade(s) em estoque.',
           'low_stock',
           '/admin?tab=inventory'
    from public.user_roles ur
    where ur.role='admin'::public.app_role;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_admins_low_stock on public.products;
create trigger trg_notify_admins_low_stock
after insert or update of stock on public.products
for each row execute function private.notify_admins_low_stock();

-- Ensure existing products that are already at or below the threshold are surfaced once.
insert into public.user_notifications(user_id,title,message,type,action_path)
select ur.user_id,
       'Estoque baixo',
       p.name || ' está com ' || p.stock || ' unidade(s) em estoque.',
       'low_stock',
       '/admin?tab=inventory'
from public.user_roles ur
cross join public.products p
where ur.role='admin'::public.app_role
  and p.active=true
  and p.stock <= 6
  and not exists (
    select 1
    from public.user_notifications n
    where n.user_id=ur.user_id
      and n.type='low_stock'
      and n.message like p.name || '%'
      and n.read_at is null
  );
