-- Permit a zero-length route only when pickup and dropoff coordinates coincide.
-- Keep the existing authenticated partner quote, inventory, and payment rules.
DO $$
DECLARE definition text;
BEGIN
  definition := pg_get_functiondef('private.partner_command(text,jsonb)'::regprocedure);
  IF position('km<=0 or km>250' in definition) > 0 THEN
    definition := replace(definition,
      'km<=0 or km>250',
      'km<0 or km>250 or (km=0 and (r.lat is distinct from s.lat or r.lng is distinct from s.lng))');
    EXECUTE definition;
  ELSIF position('km<0 or km>250 or (km=0' in definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected partner quote validation; migration aborted';
  END IF;
END $$;
