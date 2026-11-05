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
