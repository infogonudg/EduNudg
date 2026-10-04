-- Platform admin brand domain mapping RPCs.
BEGIN;

SELECT plan(4);

SELECT has_function(
  'public',
  'upsert_brand_domain_mapping',
  ARRAY['uuid', 'text', 'boolean'],
  'upsert_brand_domain_mapping exists'
);

SELECT has_function(
  'public',
  'delete_brand_domain_mapping',
  ARRAY['uuid', 'text'],
  'delete_brand_domain_mapping exists'
);

SELECT ok(
  has_function_privilege('authenticated', 'public.upsert_brand_domain_mapping(uuid, text, boolean)', 'execute'),
  'authenticated can execute upsert_brand_domain_mapping'
);

SELECT ok(
  NOT has_function_privilege('anon', 'public.upsert_brand_domain_mapping(uuid, text, boolean)', 'execute'),
  'anon cannot execute upsert_brand_domain_mapping'
);

SELECT * FROM finish();
ROLLBACK;
