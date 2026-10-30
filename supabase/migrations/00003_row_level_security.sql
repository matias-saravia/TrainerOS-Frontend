-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — Row Level Security
-- Trainers reach only their own data. Clients reach only what is theirs.
-- Anonymous visitors reach nothing through the tables.
--
-- WARNING: this ends the anonymous /alumno/:id links. Deploy together with
-- the client login (00004 and the frontend routes).
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. Helpers ───────────────────────────────────────────────────────
-- SECURITY DEFINER avoids recursion between policies that read each other's
-- tables. Each helper only answers about the calling user. They need EXECUTE
-- for authenticated because policies run as the querying role.
CREATE OR REPLACE FUNCTION private.is_trainer()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'trainer'
  );
$$;

CREATE OR REPLACE FUNCTION private.my_client_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT id FROM public.clients WHERE user_id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION private.my_trainer_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT trainer_id FROM public.clients WHERE user_id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION private.owns_client(p_client_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = p_client_id AND trainer_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION private.owns_routine(p_routine_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.routines
    WHERE id = p_routine_id AND trainer_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION private.is_assigned_routine(p_routine_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_routines cr
    JOIN public.clients c ON c.id = cr.client_id
    WHERE cr.routine_id = p_routine_id AND c.user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION private.block_routine_id(p_block_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT routine_id FROM public.routine_blocks WHERE id = p_block_id;
$$;

CREATE OR REPLACE FUNCTION private.session_client_id(p_session_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT client_id FROM public.workout_sessions WHERE id = p_session_id;
$$;

-- An exercise a trainer may use: global, or their own.
CREATE OR REPLACE FUNCTION private.can_use_exercise(p_exercise_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.exercises
    WHERE id = p_exercise_id
      AND (trainer_id IS NULL OR trainer_id = (SELECT auth.uid()))
  );
$$;

DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'private.is_trainer()',
    'private.my_client_ids()',
    'private.my_trainer_ids()',
    'private.owns_client(uuid)',
    'private.owns_routine(uuid)',
    'private.is_assigned_routine(uuid)',
    'private.block_routine_id(uuid)',
    'private.session_client_id(uuid)',
    'private.can_use_exercise(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;

-- ─── 2. Enable RLS and close anonymous access ─────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_block_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Drop anything that was created by hand in the dashboard: a single leftover
-- permissive policy would silently undo the isolation below.
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- ─── 3. Profiles ──────────────────────────────────────────────────────
-- Rows are created by the signup trigger. Role and slug cannot be edited.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM authenticated;
GRANT UPDATE (nombre, apellido, avatar_url, telefono) ON public.profiles TO authenticated;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ─── 4. Clients ───────────────────────────────────────────────────────
CREATE POLICY clients_trainer_all ON public.clients
  FOR ALL TO authenticated
  USING (trainer_id = (SELECT auth.uid()))
  WITH CHECK (trainer_id = (SELECT auth.uid()) AND (SELECT private.is_trainer()));

CREATE POLICY clients_student_select ON public.clients
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- A trainer must not attach an arbitrary account to a client row, nor hand a
-- client over to another trainer. Linking only happens through the claim RPC,
-- whose SECURITY DEFINER context is not 'authenticated'.
CREATE OR REPLACE FUNCTION private.protect_client_link()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' AND NEW.user_id IS NOT NULL THEN
      RAISE EXCEPTION 'user_id cannot be set directly' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND (
      NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.trainer_id IS DISTINCT FROM OLD.trainer_id
    ) THEN
      RAISE EXCEPTION 'user_id and trainer_id cannot be changed directly' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_client_link ON public.clients;
CREATE TRIGGER protect_client_link
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION private.protect_client_link();

GRANT EXECUTE ON FUNCTION private.protect_client_link() TO authenticated;

-- ─── 5. Exercises ─────────────────────────────────────────────────────
CREATE POLICY exercises_select ON public.exercises
  FOR SELECT TO authenticated
  USING (
    trainer_id IS NULL
    OR trainer_id = (SELECT auth.uid())
    OR trainer_id IN (SELECT private.my_trainer_ids())
  );

CREATE POLICY exercises_trainer_insert ON public.exercises
  FOR INSERT TO authenticated
  WITH CHECK (trainer_id = (SELECT auth.uid()) AND (SELECT private.is_trainer()));

CREATE POLICY exercises_trainer_update ON public.exercises
  FOR UPDATE TO authenticated
  USING (trainer_id = (SELECT auth.uid()))
  WITH CHECK (trainer_id = (SELECT auth.uid()));

CREATE POLICY exercises_trainer_delete ON public.exercises
  FOR DELETE TO authenticated
  USING (trainer_id = (SELECT auth.uid()));

-- ─── 6. Routines ──────────────────────────────────────────────────────
CREATE POLICY routines_trainer_all ON public.routines
  FOR ALL TO authenticated
  USING (trainer_id = (SELECT auth.uid()))
  WITH CHECK (trainer_id = (SELECT auth.uid()) AND (SELECT private.is_trainer()));

CREATE POLICY routines_student_select ON public.routines
  FOR SELECT TO authenticated
  USING (private.is_assigned_routine(id));

CREATE POLICY routine_blocks_trainer_all ON public.routine_blocks
  FOR ALL TO authenticated
  USING (private.owns_routine(routine_id))
  WITH CHECK (private.owns_routine(routine_id));

CREATE POLICY routine_blocks_student_select ON public.routine_blocks
  FOR SELECT TO authenticated
  USING (private.is_assigned_routine(routine_id));

CREATE POLICY block_exercises_trainer_all ON public.routine_block_exercises
  FOR ALL TO authenticated
  USING (private.owns_routine(private.block_routine_id(block_id)))
  WITH CHECK (
    private.owns_routine(private.block_routine_id(block_id))
    AND private.can_use_exercise(exercise_id)
  );

CREATE POLICY block_exercises_student_select ON public.routine_block_exercises
  FOR SELECT TO authenticated
  USING (private.is_assigned_routine(private.block_routine_id(block_id)));

-- ─── 7. Assignments ───────────────────────────────────────────────────
CREATE POLICY client_routines_trainer_all ON public.client_routines
  FOR ALL TO authenticated
  USING (private.owns_client(client_id))
  WITH CHECK (private.owns_client(client_id) AND private.owns_routine(routine_id));

CREATE POLICY client_routines_student_select ON public.client_routines
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT private.my_client_ids()));

-- ─── 8. Sessions and progress ─────────────────────────────────────────
-- Sessions are read-only through the API: writes go through RPCs.
REVOKE INSERT, UPDATE, DELETE ON public.workout_sessions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.session_exercises FROM authenticated;

CREATE POLICY sessions_select ON public.workout_sessions
  FOR SELECT TO authenticated
  USING (
    trainer_id = (SELECT auth.uid())
    OR client_id IN (SELECT private.my_client_ids())
  );

CREATE POLICY session_exercises_select ON public.session_exercises
  FOR SELECT TO authenticated
  USING (
    private.owns_client(private.session_client_id(session_id))
    OR private.session_client_id(session_id) IN (SELECT private.my_client_ids())
  );

CREATE POLICY weight_entries_select ON public.weight_entries
  FOR SELECT TO authenticated
  USING (
    private.owns_client(client_id)
    OR client_id IN (SELECT private.my_client_ids())
  );

CREATE POLICY weight_entries_student_insert ON public.weight_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (SELECT private.my_client_ids())
    AND (session_id IS NULL OR private.session_client_id(session_id) = client_id)
  );
