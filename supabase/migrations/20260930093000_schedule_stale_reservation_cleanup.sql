create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  if exists (select 1 from cron.job where jobname='expire-stale-commerce-reservations') then
    perform cron.unschedule(jobid) from cron.job where jobname='expire-stale-commerce-reservations';
  end if;
end $$;

select cron.schedule(
  'expire-stale-commerce-reservations',
  '* * * * *',
  $cron$
    select private.expire_stale_orders();
    select private.expire_stale_partner_requests();
  $cron$
);