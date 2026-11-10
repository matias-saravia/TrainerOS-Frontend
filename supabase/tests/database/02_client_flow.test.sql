-- Client access and workout session tests. Run with: npx supabase test db
BEGIN;
SELECT plan(36);

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

-- ─── Undo ─────────────────────────────────────────────────────────────
SELECT is((public.undo_workout_set((SELECT id FROM se))).sets_completados, 1, 'undo takes back the last set');
SELECT is((SELECT count(*)::int FROM public.weight_entries), 1, 'undo removes that set''s weight from the history');
SELECT is((public.log_workout_set((SELECT id FROM se))).sets_completados, 2, 'a set without weight is counted');
SELECT is((SELECT count(*)::int FROM public.weight_entries), 1, 'a set without weight leaves no history entry');
SELECT is((public.undo_workout_set((SELECT id FROM se))).sets_completados, 1, 'a set without weight can be undone');
SELECT is((SELECT count(*)::int FROM public.weight_entries), 1, 'undoing a set without weight keeps the earlier weight');

SELECT lives_ok(format($$SELECT public.complete_workout_session(%L, 8::smallint, '  Me costó el press  ')$$, (SELECT id FROM started)), 'session can be finished');
SELECT is((SELECT esfuerzo::int || '|' || notes FROM public.workout_sessions WHERE id = (SELECT id FROM started)), '8|Me costó el press', 'effort and comment are saved');
SELECT throws_ok(format($$SELECT public.complete_workout_session(%L, 11::smallint)$$, (SELECT id FROM started)), '23514', NULL, 'effort goes from 1 to 10');

-- ─── The trainer answers the comment ──────────────────────────────────
SELECT throws_ok(format($$SELECT public.reply_to_session(%L, 'Hola')$$, (SELECT id FROM started)), '42501', NULL, 'a student cannot write the reply');
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT lives_ok(format($$SELECT public.reply_to_session(%L, '  Bajá a 50 kg la próxima  ')$$, (SELECT id FROM started)), 'the trainer replies');
SELECT is((SELECT respuesta FROM public.workout_sessions WHERE id = (SELECT id FROM started)), 'Bajá a 50 kg la próxima', 'the reply is saved trimmed');
SELECT lives_ok(format($$SELECT public.reply_to_session(%L, '')$$, (SELECT id FROM started)), 'an empty reply');
SELECT is((SELECT respuesta_at FROM public.workout_sessions WHERE id = (SELECT id FROM started)), NULL, 'an empty reply removes it');
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT throws_ok(
  format($$SELECT public.log_workout_set(%L, 70)$$, (SELECT id FROM se)),
  '42501', NULL, 'a finished session no longer accepts sets');
SELECT throws_ok(
  format($$SELECT public.undo_workout_set(%L)$$, (SELECT id FROM se)),
  '42501', NULL, 'a finished session cannot be changed');

-- ─── A session left open does not carry over to another day ──────────
CREATE TEMP TABLE day1 AS SELECT public.start_workout_session('a2000000-0000-0000-0000-000000000001', '2026-01-17') AS id;
CREATE TEMP TABLE day2 AS SELECT public.start_workout_session('a2000000-0000-0000-0000-000000000001', '2026-01-18') AS id;
SELECT isnt((SELECT id FROM day2), (SELECT id FROM day1), 'a new day starts a new session');
SELECT is((SELECT count(*)::int FROM public.workout_sessions WHERE id = (SELECT id FROM day1)), 0, 'an earlier open session with no sets is removed');
SELECT lives_ok(format($$SELECT public.log_workout_set(%L, 40)$$, (SELECT id FROM public.session_exercises WHERE session_id = (SELECT id FROM day2))), 'a set is logged on the new session');
CREATE TEMP TABLE day3 AS SELECT public.start_workout_session('a2000000-0000-0000-0000-000000000001', '2026-01-19') AS id;
SELECT is((SELECT status::text FROM public.workout_sessions WHERE id = (SELECT id FROM day2)), 'completed', 'an earlier open session with sets is closed as it was left');
SELECT is(public.start_workout_session('a2000000-0000-0000-0000-000000000001', '2026-01-19'), (SELECT id FROM day3), 'the same day still resumes the open session');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
