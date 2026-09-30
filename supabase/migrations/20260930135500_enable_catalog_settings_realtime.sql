do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='catalog_settings'
  ) then
    alter publication supabase_realtime add table public.catalog_settings;
  end if;
end $$;
