-- Atomic routine save tests. Run with: npx supabase test db
BEGIN;
SELECT plan(7);

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'ana@test.com', NOW(), '{"role":"trainer","nombre":"Ana","apellido":"Paz"}'),
  ('b0000000-0000-0000-0000-000000000001', 'beto@test.com', NOW(), '{"role":"trainer","nombre":"Beto","apellido":"Paz"}'),
  ('a0000000-0000-0000-0000-000000000002', 'alu@test.com', NOW(), '{}');
INSERT INTO public.clients (id, trainer_id, user_id, nombre, email) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Alu', 'alu@test.com');
INSERT INTO public.exercises (id, trainer_id, nombre, grupo_muscular) VALUES
  ('e0000000-0000-0000-0000-000000000001', NULL, 'Press', 'Pecho'),
  ('e0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-000000000001', 'De Beto', 'Pecho');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

CREATE TEMP TABLE saved AS SELECT public.save_routine(NULL, 'Empuje', NULL,
  '[{"label":"A","type":"single","exercises":[{"exercise_id":"e0000000-0000-0000-0000-000000000001","sets":3,"reps":"10"}]}]') AS id;
SELECT is((SELECT count(*)::int FROM public.routine_block_exercises), 1, 'creates routine with exercises');

-- A session taken before the edit keeps its copy
INSERT INTO public.client_routines (client_id, routine_id)
  SELECT 'a1000000-0000-0000-0000-000000000001', id FROM saved;
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT public.start_workout_session((SELECT id FROM saved));
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT is(
  public.save_routine((SELECT id FROM saved), 'Empuje B', NULL,
    '[{"label":"A","type":"single","exercises":[{"exercise_id":"e0000000-0000-0000-0000-000000000001","sets":5,"reps":"5"}]}]'),
  (SELECT id FROM saved), 'edits keep the routine ID');
SELECT is((SELECT sets FROM public.routine_block_exercises), 5, 'edit replaces the exercises');
SELECT is((SELECT series FROM public.session_exercises), 3, 'sessions already started keep their copy');

SELECT throws_ok(
  format($$SELECT public.save_routine(%L, 'Roto', NULL, '[{"label":"A","type":"single","exercises":[{"exercise_id":"e0000000-0000-0000-0000-00000000000b","sets":1,"reps":"1"}]}]')$$, (SELECT id FROM saved)),
  '42501', NULL, 'cannot use an exercise of another trainer');
SELECT is((SELECT nombre FROM public.routines WHERE id = (SELECT id FROM saved)), 'Empuje B', 'a failed save changes nothing');

SELECT set_config('request.jwt.claims', '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT throws_ok(
  format($$SELECT public.save_routine(%L, 'Hack', NULL, '[]')$$, (SELECT id FROM saved)),
  '42501', NULL, 'cannot edit a routine of another trainer');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
