-- Client access and workout session tests. Run with: npx supabase test db
BEGIN;
SELECT plan(17);

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'ana@test.com', NOW(), '{"role":"trainer","nombre":"Ana","apellido":"Paz"}'),
  ('a0000000-0000-0000-0000-000000000002', 'alu@test.com', NOW(), '{}'),
  ('a0000000-0000-0000-0000-000000000003', 'extra@test.com', NOW(), '{}'),
  ('a0000000-0000-0000-0000-000000000004', 'pending@test.com', NULL, '{}');

INSERT INTO public.clients (id, trainer_id, nombre, email) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Alu', 'alu@test.com'),
  ('a1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Pendiente', 'pending@test.com');

INSERT INTO public.exercises (id, nombre, grupo_muscular) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Press', 'Pecho');
INSERT INTO public.routines (id, trainer_id, nombre) VALUES
  ('a2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Empuje'),
  ('a2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'No asignada');
INSERT INTO public.routine_blocks (id, routine_id, label) VALUES
  ('a4000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'A');
INSERT INTO public.routine_block_exercises (block_id, exercise_id, sets, reps) VALUES
  ('a4000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 2, '10');
INSERT INTO public.client_routines (client_id, routine_id) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001');

-- ─── Public trainer page ──────────────────────────────────────────────
SET LOCAL ROLE anon;
SELECT is((SELECT nombre FROM public.get_trainer_public('ana-paz')), 'Ana', 'anon can load the public trainer page');
SELECT is((SELECT count(*)::int FROM public.get_trainer_public('nadie')), 0, 'unknown slug returns nothing');
SELECT throws_ok($$SELECT public.claim_client_access('ana-paz')$$, '42501', NULL, 'anon cannot claim access');
RESET ROLE;

-- ─── Claim ────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT throws_ok($$SELECT public.claim_client_access('ana-paz')$$, 'P0001', 'not_invited', 'email not loaded by the trainer cannot enter');

SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT throws_ok($$SELECT public.claim_client_access('ana-paz')$$, 'P0001', 'not_invited', 'unconfirmed email cannot enter');

SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.start_workout_session('a2000000-0000-0000-0000-000000000001')$$,
  '42501', NULL, 'an account not linked yet cannot start a session');
SELECT is(public.claim_client_access('ana-paz'), 'a1000000-0000-0000-0000-000000000001'::uuid, 'invited email is linked');
SELECT is(public.claim_client_access('ana-paz'), 'a1000000-0000-0000-0000-000000000001'::uuid, 'claim is repeatable');

-- ─── Session ──────────────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.start_workout_session('a2000000-0000-0000-0000-000000000002')$$,
  '42501', NULL, 'student cannot start a routine that is not assigned');

CREATE TEMP TABLE started AS
  SELECT public.start_workout_session('a2000000-0000-0000-0000-000000000001', '2026-01-15') AS id;
SELECT is(public.start_workout_session('a2000000-0000-0000-0000-000000000001'), (SELECT id FROM started), 'starting twice resumes the open session');
SELECT is((SELECT count(*)::int FROM public.session_exercises), 1, 'exercises were copied once');

CREATE TEMP TABLE se AS SELECT id FROM public.session_exercises;
SELECT is((public.log_workout_set((SELECT id FROM se), 50)).sets_completados, 1, 'set is counted');
SELECT is((public.log_workout_set((SELECT id FROM se), 55)).peso_registrado, 55.00::numeric, 'weight is saved');
SELECT is((public.log_workout_set((SELECT id FROM se), 60)).sets_completados, 2, 'extra sets do not go past the plan');
SELECT is((SELECT count(*)::int FROM public.weight_entries WHERE fecha = '2026-01-15'), 2, 'history has one entry per counted set, on the session date');

SELECT lives_ok(format($$SELECT public.complete_workout_session(%L)$$, (SELECT id FROM started)), 'session can be finished');
SELECT throws_ok(
  format($$SELECT public.log_workout_set(%L, 70)$$, (SELECT id FROM se)),
  '42501', NULL, 'a finished session no longer accepts sets');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
