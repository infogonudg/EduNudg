-- resolve_hostname_tenant: anon can resolve custom domain → brand slug without brands RLS.
BEGIN;

SELECT plan(3);

SELECT has_function(
  'public',
  'resolve_hostname_tenant',
  ARRAY['text'],
  'resolve_hostname_tenant(text) exists'
);

SELECT ok(
  has_function_privilege('anon', 'public.resolve_hostname_tenant(text)', 'execute'),
  'anon can execute resolve_hostname_tenant'
);

SELECT ok(
  has_function_privilege('authenticated', 'public.resolve_hostname_tenant(text)', 'execute'),
  'authenticated can execute resolve_hostname_tenant'
);

SELECT * FROM finish();
ROLLBACK;
