ALTER TABLE public.orders
  ALTER COLUMN delivery_status SET DEFAULT 'aguardando_pagamento';

UPDATE public.orders
SET delivery_status = 'aguardando_pagamento'
WHERE payment_status <> 'paid'
  AND delivery_status = 'postado';
