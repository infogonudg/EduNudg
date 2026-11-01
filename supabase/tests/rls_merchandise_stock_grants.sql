-- RLS: merchandise_stock_grants + grant_center_merchandise_stock

BEGIN;

SELECT plan(5);

SELECT has_table('public', 'merchandise_stock_grants', 'merchandise_stock_grants exists');
SELECT has_column('public', 'merchandise_stock_grants', 'quantity', 'quantity column exists');
SELECT policies_are(
  'public',
  'merchandise_stock_grants',
  ARRAY['merchandise_stock_grants_select', 'merchandise_stock_grants_write']
);
SELECT has_function(
  'public',
  'grant_center_merchandise_stock',
  ARRAY['uuid', 'uuid', 'uuid', 'int', 'text'],
  'grant_center_merchandise_stock exists'
);
SELECT isnt_empty(
  $$
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'grant_center_merchandise_stock'
      AND p.prosecdef
  $$,
  'grant_center_merchandise_stock is SECURITY DEFINER'
);

SELECT * FROM finish();
ROLLBACK;
