-- Tenant isolation tests. Run with: npx supabase test db
BEGIN;
SELECT plan(26);

-- ─── Fixtures: two trainers, each with a linked student ───────────────
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'ana@test.com', '{"role":"trainer","nombre":"Ana","apellido":"Núñez"}'),
  ('b0000000-0000-0000-0000-000000000001', 'beto@test.com', '{"role":"trainer","nombre":"Beto","apellido":"Paz"}'),
  ('a0000000-0000-0000-0000-000000000002', 'alu.a@test.com', '{"nombre":"Alu","apellido":"A"}'),
  ('b0000000-0000-0000-0000-000000000002', 'alu.b@test.com', '{"role":"admin","nombre":"Alu","apellido":"B"}');

INSERT INTO public.clients (id, trainer_id, user_id, nombre, email) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Alu A', 'alu.a@test.com'),
  ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Alu B', 'alu.b@test.com');

INSERT INTO public.exercises (id, trainer_id, nombre, grupo_muscular) VALUES
  ('e0000000-0000-0000-0000-000000000000', NULL, 'Global', 'Pecho'),
  ('e0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000001', 'De Ana', 'Pecho'),
  ('e0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-000000000001', 'De Beto', 'Pecho');

INSERT INTO public.routines (id, trainer_id, nombre) VALUES
  ('a2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Rutina Ana asignada'),
  ('a2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Rutina Ana libre'),
  ('b2000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Rutina Beto');

INSERT INTO public.client_routines (client_id, routine_id) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001');

INSERT INTO public.workout_sessions (id, client_id, trainer_id, nombre) VALUES
  ('a3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Sesión A');

-- ─── Signup trigger ───────────────────────────────────────────────────
SELECT is((SELECT role::text FROM public.profiles WHERE id = 'a0000000-0000-0000-0000-000000000001'), 'trainer', 'trainer signup gets trainer role');
SELECT is((SELECT slug FROM public.profiles WHERE id = 'a0000000-0000-0000-0000-000000000001'), 'ana-nunez', 'trainer gets a clean slug');
SELECT is((SELECT role::text FROM public.profiles WHERE id = 'b0000000-0000-0000-0000-000000000002'), 'client', 'unknown role falls back to client');
SELECT is((SELECT slug FROM public.profiles WHERE id = 'a0000000-0000-0000-0000-000000000002'), NULL, 'clients have no slug');

-- ─── Anonymous ────────────────────────────────────────────────────────
SET LOCAL ROLE anon;
SELECT throws_ok('SELECT * FROM public.clients', '42501', NULL, 'anon cannot read clients');
SELECT throws_ok('SELECT * FROM public.routines', '42501', NULL, 'anon cannot read routines');
SELECT throws_ok('SELECT * FROM public.weight_entries', '42501', NULL, 'anon cannot read weight entries');
RESET ROLE;

-- ─── Trainer A ────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT is((SELECT count(*)::int FROM public.clients), 1, 'trainer sees only own clients');
SELECT is((SELECT count(*)::int FROM public.routines), 2, 'trainer sees only own routines');
SELECT is((SELECT count(*)::int FROM public.exercises WHERE id::text LIKE 'e0000000%'), 2, 'trainer sees global and own exercises');
SELECT is((SELECT count(*)::int FROM public.profiles), 1, 'trainer sees only own profile');

SELECT throws_ok(
  $$INSERT INTO public.clients (trainer_id, nombre, email) VALUES ('b0000000-0000-0000-0000-000000000001', 'X', 'x@test.com')$$,
  '42501', NULL, 'trainer cannot create clients for another trainer');
SELECT throws_ok(
  $$INSERT INTO public.client_routines (client_id, routine_id) VALUES ('a1000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001')$$,
  '42501', NULL, 'trainer cannot assign a routine of another trainer');
SELECT throws_ok(
  $$UPDATE public.clients SET user_id = 'b0000000-0000-0000-0000-000000000002' WHERE id = 'a1000000-0000-0000-0000-000000000001'$$,
  '42501', NULL, 'trainer cannot attach an account to a client directly');
SELECT throws_ok(
  $$UPDATE public.profiles SET role = 'client' WHERE id = 'a0000000-0000-0000-0000-000000000001'$$,
  '42501', NULL, 'nobody can change their role');

WITH deleted AS (DELETE FROM public.clients WHERE id = 'b1000000-0000-0000-0000-000000000001' RETURNING 1)
SELECT is((SELECT count(*)::int FROM deleted), 0, 'trainer cannot delete a client of another trainer');

WITH updated AS (UPDATE public.exercises SET nombre = 'hack' WHERE id = 'e0000000-0000-0000-0000-000000000000' RETURNING 1)
SELECT is((SELECT count(*)::int FROM updated), 0, 'trainer cannot edit global exercises');
RESET ROLE;

-- ─── Student A ────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

SELECT is((SELECT count(*)::int FROM public.clients), 1, 'student sees only their client row');
SELECT is((SELECT count(*)::int FROM public.routines), 1, 'student sees only assigned routines');
SELECT is((SELECT count(*)::int FROM public.exercises WHERE id::text LIKE 'e0000000%'), 2, 'student sees global and their trainer exercises');
SELECT is((SELECT count(*)::int FROM public.workout_sessions), 1, 'student sees own sessions');

SELECT throws_ok(
  $$INSERT INTO public.routines (trainer_id, nombre) VALUES ('a0000000-0000-0000-0000-000000000002', 'X')$$,
  '42501', NULL, 'student cannot create routines');
SELECT throws_ok(
  $$UPDATE public.workout_sessions SET status = 'completed'$$,
  '42501', NULL, 'student cannot write sessions directly');
SELECT throws_ok(
  $$INSERT INTO public.weight_entries (client_id, exercise_id, kg) VALUES ('b1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000000', 50)$$,
  '42501', NULL, 'student cannot log weight for someone else');
SELECT lives_ok(
  $$INSERT INTO public.weight_entries (client_id, exercise_id, kg) VALUES ('a1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000000', 50)$$,
  'student can log own weight');
RESET ROLE;

-- ─── Student B sees nothing of trainer A ──────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"b0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.weight_entries), 0, 'student cannot read weight entries of others');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
