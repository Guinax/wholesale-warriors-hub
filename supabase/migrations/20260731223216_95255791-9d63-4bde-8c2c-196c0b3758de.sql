CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.unschedule('expire-overdue-orders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-overdue-orders');

SELECT cron.schedule(
  'expire-overdue-orders',
  '*/10 * * * *',
  $$SELECT public.expire_overdue_orders();$$
);
