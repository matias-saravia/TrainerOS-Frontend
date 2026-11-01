-- Attempt limit tests. Run with: npx supabase test db
BEGIN;
SELECT plan(6);

SELECT ok(public.register_access_attempt('t:a', 2, 900), 'first attempt is allowed');
SELECT ok(public.register_access_attempt('t:a', 2, 900), 'attempt at the limit is allowed');
SELECT ok(NOT public.register_access_attempt('t:a', 2, 900), 'attempt over the limit is refused');
SELECT ok(public.register_access_attempt('t:b', 2, 900), 'each key has its own count');

UPDATE private.access_attempts SET window_started_at = NOW() - INTERVAL '16 minutes' WHERE key = 't:a';
SELECT ok(public.register_access_attempt('t:a', 2, 900), 'the count restarts after the window');

SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT public.register_access_attempt('t:a', 1000, 900)$$,
  '42501', NULL, 'the public API cannot call it'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
