-- sync_student_portal_credentials for staff-provisioned learn logins

BEGIN;

SELECT plan(2);

SELECT has_function(
  'public',
  'sync_student_portal_credentials',
  ARRAY['uuid', 'uuid', 'uuid', 'uuid', 'text'],
  'sync_student_portal_credentials exists'
);

SELECT isnt_empty(
  $$
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'sync_student_portal_credentials'
      AND p.prosecdef
  $$,
  'sync_student_portal_credentials is SECURITY DEFINER'
);

SELECT * FROM finish();
ROLLBACK;
