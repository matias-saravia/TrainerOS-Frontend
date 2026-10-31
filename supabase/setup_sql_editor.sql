-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — Setup completo para el SQL Editor de Supabase
--
-- ⚠ BORRA TODO lo que hay en el esquema public y TODOS los usuarios de Auth.
--   No se puede deshacer. Corré esto solo en el proyecto de TrainerOS.
--
-- Pegá el archivo entero y ejecutalo una sola vez.
-- La base queda vacía, sin ejercicios ni datos de ejemplo.
-- Generado desde supabase/migrations.
-- ═══════════════════════════════════════════════════════════════════════

-- ─── RESET ────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname, c.relkind
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind IN ('v', 'm')
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e'
      )
  LOOP
    EXECUTE format(
      'DROP %s IF EXISTS public.%I CASCADE',
      CASE r.relkind WHEN 'm' THEN 'MATERIALIZED VIEW' ELSE 'VIEW' END,
      r.relname
    );
  END LOOP;

  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP TABLE public.%I CASCADE', r.tablename);
  END LOOP;

  -- Also removes triggers on auth.users that were created by hand.
  -- Functions and types owned by extensions are left alone.
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e'
      )
  LOOP
    EXECUTE format('DROP FUNCTION %s CASCADE', r.fn);
  END LOOP;

  FOR r IN
    SELECT t.typname
    FROM pg_type t
    WHERE t.typnamespace = 'public'::regnamespace
      AND t.typtype = 'e'
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_type'::regclass AND d.objid = t.oid AND d.deptype = 'e'
      )
  LOOP
    EXECUTE format('DROP TYPE public.%I CASCADE', r.typname);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP SCHEMA IF EXISTS private CASCADE;
DELETE FROM auth.users;


-- ▼▼▼ 00001_init_schema.sql ▼▼▼
-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — Initial Schema Migration
-- ═══════════════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. Enums ────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('trainer', 'client');
CREATE TYPE muscle_group AS ENUM (
  'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Bíceps', 'Tríceps', 'Core', 'Glúteos'
);
CREATE TYPE exercise_difficulty AS ENUM ('Principiante', 'Intermedio', 'Avanzado');
CREATE TYPE block_type AS ENUM ('single', 'superset');
CREATE TYPE session_status AS ENUM ('pending', 'in-progress', 'completed');
CREATE TYPE client_status AS ENUM ('aldia', 'vence', 'pendiente');
CREATE TYPE plan_tier AS ENUM ('basico', 'estandar', 'premium', 'personalizado');

-- ─── 2. Profiles (Extends auth.users) ─────────────────────────────────
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'client',
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  avatar_url TEXT,
  telefono TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. Clients (Trainer-Client relationship) ─────────────────────────
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  telefono TEXT,
  fecha_nacimiento DATE,
  plan_tier plan_tier NOT NULL DEFAULT 'basico',
  status client_status NOT NULL DEFAULT 'aldia',
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  estado_pago TEXT NOT NULL DEFAULT 'pagado',

  -- Physical profile
  peso_inicial NUMERIC(5, 2),
  altura NUMERIC(5, 2),
  grasa_corporal NUMERIC(4, 1),
  experiencia exercise_difficulty NOT NULL DEFAULT 'Principiante',
  objetivo TEXT,
  historial_medico TEXT,
  consideraciones TEXT,

  semana_actual INT NOT NULL DEFAULT 1,
  total_semanas INT NOT NULL DEFAULT 12,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_trainer ON public.clients(trainer_id);
CREATE INDEX idx_clients_user ON public.clients(user_id);

-- ─── 4. Exercises (Global bank + Custom per trainer) ──────────────────
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  grupo_muscular muscle_group NOT NULL,
  grupos_secundarios muscle_group[] DEFAULT '{}',
  dificultad exercise_difficulty NOT NULL DEFAULT 'Principiante',
  instrucciones TEXT[] NOT NULL DEFAULT '{}',
  video_url TEXT,
  imagen_url TEXT,
  series_default INT DEFAULT 3,
  duracion_estimada INT DEFAULT 45,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exercises_trainer ON public.exercises(trainer_id);
CREATE INDEX idx_exercises_muscle ON public.exercises(grupo_muscular);

-- ─── 5. Routines ──────────────────────────────────────────────────────
CREATE TABLE public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  dia TEXT,
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routines_trainer ON public.routines(trainer_id);

-- ─── 6. Routine Blocks ───────────────────────────────────────────────
CREATE TABLE public.routine_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type block_type NOT NULL DEFAULT 'single',
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routine_blocks_routine ON public.routine_blocks(routine_id);

-- ─── 7. Routine Block Exercises ───────────────────────────────────────
CREATE TABLE public.routine_block_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES public.routine_blocks(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  sets INT NOT NULL DEFAULT 3,
  reps TEXT NOT NULL DEFAULT '10-12',
  tempo TEXT DEFAULT '2-0-1-0',
  rest_seconds INT DEFAULT 90,
  notes TEXT,
  order_index INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_block_exercises_block ON public.routine_block_exercises(block_id);
CREATE INDEX idx_block_exercises_exercise ON public.routine_block_exercises(exercise_id);

-- ─── 8. Workout Sessions (Assigned to clients) ───────────────────────
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  status session_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_client ON public.workout_sessions(client_id);
CREATE INDEX idx_sessions_trainer ON public.workout_sessions(trainer_id);
CREATE INDEX idx_sessions_fecha ON public.workout_sessions(fecha);

-- ─── 9. Session Exercises ─────────────────────────────────────────────
CREATE TABLE public.session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  order_index INT NOT NULL DEFAULT 0,
  categoria TEXT DEFAULT 'Hipertrofia',
  series INT NOT NULL DEFAULT 3,
  reps TEXT NOT NULL DEFAULT '10-12',
  descanso INT NOT NULL DEFAULT 90,
  peso_objetivo NUMERIC(5, 2),
  sets_completados INT NOT NULL DEFAULT 0,
  peso_registrado NUMERIC(5, 2),
  notes TEXT
);

CREATE INDEX idx_session_exercises_session ON public.session_exercises(session_id);

-- ─── 10. Weight Entries (Historical progression logs) ─────────────────
CREATE TABLE public.weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  kg NUMERIC(5, 2) NOT NULL,
  reps INT,
  rpe NUMERIC(3, 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_weight_entries_client_exercise ON public.weight_entries(client_id, exercise_id);
CREATE INDEX idx_weight_entries_fecha ON public.weight_entries(fecha DESC);

-- ─── Updated_at trigger function ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_routines_updated_at
  BEFORE UPDATE ON public.routines
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ▼▼▼ 00002_profiles_and_schema_alignment.sql ▼▼▼
-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — Schema alignment, automatic profiles and trainer slugs
-- Safe to run on a database where client_routines was created by hand.
-- ═══════════════════════════════════════════════════════════════════════

-- Internal helpers live outside the schema exposed by the API.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

-- ─── 1. client_routines (was created outside the migrations) ──────────
CREATE TABLE IF NOT EXISTS public.client_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep the oldest assignment if the same routine was assigned twice.
DELETE FROM public.client_routines newer
USING public.client_routines older
WHERE newer.client_id = older.client_id
  AND newer.routine_id = older.routine_id
  AND (newer.assigned_at, newer.id) > (older.assigned_at, older.id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_routines_unique
  ON public.client_routines(client_id, routine_id);
CREATE INDEX IF NOT EXISTS idx_client_routines_routine
  ON public.client_routines(routine_id);

-- ─── 2. Trainer slugs ─────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE OR REPLACE FUNCTION private.generate_trainer_slug(p_nombre TEXT, p_apellido TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  base TEXT;
  candidate TEXT;
BEGIN
  base := lower(translate(
    coalesce(p_nombre, '') || ' ' || coalesce(p_apellido, ''),
    'ÁÉÍÓÚÜÑáéíóúüñ',
    'AEIOUUNaeiouun'
  ));
  base := trim(BOTH '-' FROM regexp_replace(base, '[^a-z0-9]+', '-', 'g'));
  IF length(base) < 3 THEN
    base := 'entrenador';
  END IF;

  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = candidate) LOOP
    candidate := base || '-' || substr(md5(gen_random_uuid()::text), 1, 5);
  END LOOP;

  RETURN candidate;
END;
$$;

REVOKE ALL ON FUNCTION private.generate_trainer_slug(TEXT, TEXT) FROM PUBLIC;

-- ─── 3. Profile created by the database on every signup ───────────────
-- Only 'trainer' can be requested at signup. Anything else becomes 'client',
-- which grants nothing until a trainer's client row is linked to the account.
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.user_role;
  v_nombre TEXT := coalesce(trim(NEW.raw_user_meta_data ->> 'nombre'), '');
  v_apellido TEXT := coalesce(trim(NEW.raw_user_meta_data ->> 'apellido'), '');
BEGIN
  v_role := CASE
    WHEN NEW.raw_user_meta_data ->> 'role' = 'trainer' THEN 'trainer'::public.user_role
    ELSE 'client'::public.user_role
  END;

  INSERT INTO public.profiles (id, role, nombre, apellido, slug)
  VALUES (
    NEW.id,
    v_role,
    v_nombre,
    v_apellido,
    CASE WHEN v_role = 'trainer' THEN private.generate_trainer_slug(v_nombre, v_apellido) END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- ─── 4. Backfill existing accounts ────────────────────────────────────
INSERT INTO public.profiles (id, role, nombre, apellido)
SELECT
  u.id,
  CASE WHEN u.raw_user_meta_data ->> 'role' = 'trainer'
    THEN 'trainer'::public.user_role
    ELSE 'client'::public.user_role
  END,
  coalesce(trim(u.raw_user_meta_data ->> 'nombre'), ''),
  coalesce(trim(u.raw_user_meta_data ->> 'apellido'), '')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, nombre, apellido FROM public.profiles
    WHERE role = 'trainer' AND slug IS NULL
    ORDER BY created_at
  LOOP
    UPDATE public.profiles
    SET slug = private.generate_trainer_slug(r.nombre, r.apellido)
    WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles(slug);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_slug_format;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_slug_format
  CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- ─── 5. One client per email inside each trainer ──────────────────────
-- Fails loudly on real duplicates: those need a human decision, not a guess.
UPDATE public.clients
SET email = lower(trim(email))
WHERE email <> lower(trim(email));

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_trainer_email
  ON public.clients(trainer_id, lower(email));

-- ▼▼▼ 00003_row_level_security.sql ▼▼▼
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

-- Explicit, because a project can be set not to expose new tables by default.
-- RLS decides which rows; these grants only let the roles reach the tables.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

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

-- ▼▼▼ 00004_client_access.sql ▼▼▼
-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — Client access through the trainer's public link (/t/:slug)
-- ═══════════════════════════════════════════════════════════════════════

-- Only what the public page needs to show. Never email, phone or client data.
CREATE OR REPLACE FUNCTION public.get_trainer_public(p_slug TEXT)
RETURNS TABLE (nombre TEXT, apellido TEXT, avatar_url TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.nombre, p.apellido, p.avatar_url
  FROM public.profiles p
  WHERE p.slug = lower(p_slug) AND p.role = 'trainer';
$$;

REVOKE ALL ON FUNCTION public.get_trainer_public(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trainer_public(TEXT) TO anon, authenticated;

-- Links the signed-in account to the client row its trainer created for that
-- email. The email comes from auth.users, so it was proven by the login link.
CREATE OR REPLACE FUNCTION public.claim_client_access(p_slug TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_client public.clients%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT lower(email) INTO v_email
  FROM auth.users
  WHERE id = v_uid AND email_confirmed_at IS NOT NULL;

  SELECT c.* INTO v_client
  FROM public.clients c
  JOIN public.profiles t ON t.id = c.trainer_id
  WHERE t.slug = lower(p_slug) AND lower(c.email) = v_email
  FOR UPDATE OF c;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_invited' USING ERRCODE = 'P0001';
  END IF;

  IF v_client.user_id IS NOT NULL AND v_client.user_id <> v_uid THEN
    RAISE EXCEPTION 'already_linked' USING ERRCODE = 'P0001';
  END IF;

  IF v_client.user_id IS NULL THEN
    UPDATE public.clients SET user_id = v_uid WHERE id = v_client.id;
  END IF;

  RETURN v_client.id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_client_access(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_client_access(TEXT) TO authenticated;

-- ▼▼▼ 00005_workout_session_rpcs.sql ▼▼▼
-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — Workout sessions: the only write path for student progress
-- ═══════════════════════════════════════════════════════════════════════

-- At most one open session per client and routine, even with concurrent starts.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_one_open
  ON public.workout_sessions(client_id, routine_id)
  WHERE status = 'in-progress';

-- The routine may change later: a session keeps its own copy of the exercises.
-- p_fecha comes from the device, so a late session lands on the student's day.
CREATE OR REPLACE FUNCTION public.start_workout_session(
  p_routine_id UUID,
  p_fecha DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_client_id UUID;
  v_trainer_id UUID;
  v_nombre TEXT;
  v_session_id UUID;
BEGIN
  SELECT c.id, c.trainer_id, r.nombre INTO v_client_id, v_trainer_id, v_nombre
  FROM public.client_routines cr
  JOIN public.clients c ON c.id = cr.client_id
  JOIN public.routines r ON r.id = cr.routine_id
  WHERE cr.routine_id = p_routine_id AND c.user_id = (SELECT auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'routine_not_assigned' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.workout_sessions
    (client_id, routine_id, trainer_id, nombre, fecha, status, started_at)
  VALUES
    (v_client_id, p_routine_id, v_trainer_id, v_nombre, p_fecha, 'in-progress', NOW())
  ON CONFLICT (client_id, routine_id) WHERE status = 'in-progress' DO NOTHING
  RETURNING id INTO v_session_id;

  IF v_session_id IS NULL THEN
    SELECT id INTO v_session_id
    FROM public.workout_sessions
    WHERE client_id = v_client_id AND routine_id = p_routine_id AND status = 'in-progress';
    RETURN v_session_id;
  END IF;

  INSERT INTO public.session_exercises
    (session_id, exercise_id, order_index, categoria, series, reps, descanso, notes)
  SELECT
    v_session_id,
    rbe.exercise_id,
    row_number() OVER (ORDER BY b.order_index, rbe.order_index) - 1,
    NULL,
    rbe.sets,
    rbe.reps,
    coalesce(rbe.rest_seconds, 90),
    rbe.notes
  FROM public.routine_blocks b
  JOIN public.routine_block_exercises rbe ON rbe.block_id = b.id
  WHERE b.routine_id = p_routine_id;

  RETURN v_session_id;
END;
$$;

-- Counts one finished set and records its weight. Ignored once all sets are done.
CREATE OR REPLACE FUNCTION public.log_workout_set(
  p_session_exercise_id UUID,
  p_kg NUMERIC DEFAULT NULL
)
RETURNS public.session_exercises
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_row public.session_exercises%ROWTYPE;
  v_client_id UUID;
  v_fecha DATE;
BEGIN
  IF p_kg IS NOT NULL AND (p_kg < 0 OR p_kg > 999) THEN
    RAISE EXCEPTION 'invalid_weight' USING ERRCODE = '22023';
  END IF;

  SELECT se.* INTO v_row
  FROM public.session_exercises se
  JOIN public.workout_sessions ws ON ws.id = se.session_id
  JOIN public.clients c ON c.id = ws.client_id
  WHERE se.id = p_session_exercise_id
    AND c.user_id = (SELECT auth.uid())
    AND ws.status = 'in-progress'
  FOR UPDATE OF se;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_exercise_not_available' USING ERRCODE = '42501';
  END IF;

  IF v_row.sets_completados >= v_row.series THEN
    RETURN v_row;
  END IF;

  SELECT client_id, fecha INTO v_client_id, v_fecha
  FROM public.workout_sessions
  WHERE id = v_row.session_id;

  UPDATE public.session_exercises
  SET sets_completados = sets_completados + 1,
      peso_registrado = coalesce(p_kg, peso_registrado)
  WHERE id = p_session_exercise_id
  RETURNING * INTO v_row;

  IF p_kg IS NOT NULL THEN
    INSERT INTO public.weight_entries (client_id, exercise_id, session_id, fecha, kg)
    VALUES (v_client_id, v_row.exercise_id, v_row.session_id, v_fecha, p_kg);
  END IF;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_workout_session(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.workout_sessions ws
  SET status = 'completed', completed_at = coalesce(ws.completed_at, NOW())
  FROM public.clients c
  WHERE ws.id = p_session_id
    AND c.id = ws.client_id
    AND c.user_id = (SELECT auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_available' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.start_workout_session(UUID, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_workout_set(UUID, NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_workout_session(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_workout_session(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_workout_set(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_workout_session(UUID) TO authenticated;

-- ▼▼▼ 00006_save_routine.sql ▼▼▼
-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — Create or replace a routine in a single transaction
-- Runs as the caller, so RLS still decides what can be written.
-- Past sessions are not affected: they keep their own session_exercises.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.save_routine(
  p_routine_id UUID,
  p_nombre TEXT,
  p_descripcion TEXT,
  p_blocks JSONB
)
RETURNS UUID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_routine_id UUID := p_routine_id;
  v_block JSONB;
  v_exercise JSONB;
  v_block_id UUID;
  v_block_index INT := 0;
  v_exercise_index INT;
BEGIN
  IF v_routine_id IS NULL THEN
    INSERT INTO public.routines (trainer_id, nombre, descripcion)
    VALUES ((SELECT auth.uid()), p_nombre, p_descripcion)
    RETURNING id INTO v_routine_id;
  ELSE
    UPDATE public.routines
    SET nombre = p_nombre, descripcion = p_descripcion
    WHERE id = v_routine_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'routine_not_available' USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.routine_blocks WHERE routine_id = v_routine_id;
  END IF;

  FOR v_block IN SELECT value FROM jsonb_array_elements(p_blocks) LOOP
    INSERT INTO public.routine_blocks (routine_id, label, type, order_index)
    VALUES (
      v_routine_id,
      v_block ->> 'label',
      (v_block ->> 'type')::public.block_type,
      v_block_index
    )
    RETURNING id INTO v_block_id;

    v_exercise_index := 0;
    FOR v_exercise IN SELECT value FROM jsonb_array_elements(v_block -> 'exercises') LOOP
      INSERT INTO public.routine_block_exercises
        (block_id, exercise_id, sets, reps, tempo, rest_seconds, notes, order_index)
      VALUES (
        v_block_id,
        (v_exercise ->> 'exercise_id')::UUID,
        (v_exercise ->> 'sets')::INT,
        v_exercise ->> 'reps',
        NULLIF(v_exercise ->> 'tempo', ''),
        coalesce((v_exercise ->> 'rest_seconds')::INT, 90),
        NULLIF(v_exercise ->> 'notes', ''),
        v_exercise_index
      );
      v_exercise_index := v_exercise_index + 1;
    END LOOP;

    v_block_index := v_block_index + 1;
  END LOOP;

  RETURN v_routine_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_routine(UUID, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_routine(UUID, TEXT, TEXT, JSONB) TO authenticated;

-- ─── VERIFICACIÓN ─────────────────────────────────────────────────────
-- Tiene que mostrar 10 tablas con rls_activo = true, y 0 ejercicios, clientes y usuarios.
SELECT
  t.tablename AS tabla,
  t.rowsecurity AS rls_activo,
  (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t.tablename) AS politicas,
  (SELECT count(*) FROM public.exercises) AS ejercicios,
  (SELECT count(*) FROM public.clients) AS clientes,
  (SELECT count(*) FROM auth.users) AS usuarios
FROM pg_tables t
WHERE t.schemaname = 'public'
ORDER BY t.tablename;
