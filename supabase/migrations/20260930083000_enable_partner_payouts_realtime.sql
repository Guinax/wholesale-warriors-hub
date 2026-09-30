do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='partner_payouts') then
  alter publication supabase_realtime add table public.partner_payouts;
 end if;
end $$;