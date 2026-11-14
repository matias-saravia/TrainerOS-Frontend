-- Student password: who can see whether it exists and who can clear it. Run with: npx supabase test db
BEGIN;
SELECT plan(13);

INSERT INTO auth.users (id, email, email_confirmed_at, encrypted_password, raw_user_meta_data) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'ana@test.com', NOW(), 'hash', '{"role":"trainer","nombre":"Ana","apellido":"Paz"}'),
  ('b0000000-0000-0000-0000-000000000002', 'leo@test.com', NOW(), 'hash', '{"role":"trainer","nombre":"Leo","apellido":"Gil"}'),
  ('b0000000-0000-0000-0000-000000000003', 'alu@test.com', NOW(), 'hash', '{}'),
  ('b0000000-0000-0000-0000-000000000004', 'nueva@test.com', NOW(), '', '{}'),
  ('b0000000-0000-0000-0000-000000000005', 'compartida@test.com', NOW(), 'hash', '{}');

INSERT INTO public.clients (id, trainer_id, user_id, nombre, email) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'Alu', 'alu@test.com'),
  ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', NULL, 'Sin entrar', 'nadie@test.com'),
  ('b1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'Compartida', 'compartida@test.com'),
  ('b1000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', NULL, 'Compartida', 'compartida@test.com'),
  ('b1000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Entrenador', 'leo@test.com');

INSERT INTO auth.sessions (id, user_id) VALUES ('b2000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003');

-- ─── Password state, only for the access function ─────────────────────
SELECT is((SELECT has_password FROM public.client_access_password_state('ALU@test.com')), true, 'an account with a password is reported');
SELECT is((SELECT has_password FROM public.client_access_password_state('nueva@test.com')), false, 'an account without one is reported');
SELECT is((SELECT count(*)::int FROM public.client_access_password_state('nadie@test.com')), 0, 'an unknown email returns nothing');

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM public.client_access_password_state('alu@test.com')$$, '42501', NULL, 'anon cannot ask');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.client_access_password_state('alu@test.com')$$, '42501', NULL, 'a signed-in user cannot ask');
RESET ROLE;

-- ─── Reset by the trainer ─────────────────────────────────────────────
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT public.reset_client_password('b1000000-0000-0000-0000-000000000001')$$, '42501', NULL, 'anon cannot reset');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"b0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT throws_ok($$SELECT public.reset_client_password('b1000000-0000-0000-0000-000000000001')$$, '42501', 'client_not_available', 'another trainer cannot reset it');

SELECT set_config('request.jwt.claims', '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT throws_ok($$SELECT public.reset_client_password('b1000000-0000-0000-0000-000000000003')$$, 'P0001', 'shared_account', 'an account another trainer also has is not reset');
SELECT throws_ok($$SELECT public.reset_client_password('b1000000-0000-0000-0000-000000000005')$$, 'P0001', 'shared_account', 'a trainer account is not reset');
SELECT lives_ok($$SELECT public.reset_client_password('b1000000-0000-0000-0000-000000000002')$$, 'a student who never entered has nothing to reset');
SELECT lives_ok($$SELECT public.reset_client_password('b1000000-0000-0000-0000-000000000001')$$, 'the trainer resets their own student');
RESET ROLE;

SELECT is((SELECT encrypted_password FROM auth.users WHERE id = 'b0000000-0000-0000-0000-000000000003'), '', 'the password is cleared');
SELECT is((SELECT count(*)::int FROM auth.sessions WHERE user_id = 'b0000000-0000-0000-0000-000000000003'), 0, 'open sessions are closed');

SELECT * FROM finish();
ROLLBACK;
