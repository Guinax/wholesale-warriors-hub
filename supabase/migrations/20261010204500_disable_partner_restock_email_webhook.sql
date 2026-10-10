-- Partner restock notifications are delivered through public.user_notifications.
-- Disable the obsolete email webhook without affecting the internal notification trigger.
drop trigger if exists trg_queue_partner_restock_email on public.partner_restock_orders;

-- Remove the obsolete email-related function; retain the internal notification trigger.
drop function if exists private.queue_partner_restock_email();
